import os, re
from collections import Counter
from datetime import timedelta, datetime
from utils import run_cmd
from config import TODAY, MAX_HISTORY_DAYS
from collector.repos import get_group_name


def get_commit_type(msg: str, files: list[str] | None = None) -> str:
    msg_lower = msg.lower().strip()
    for p in ["feat", "fix", "refactor", "chore", "docs", "perf", "test", "revert",
              "style", "ci", "build", "release", "hotfix", "wip", "merge"]:
        if re.match(r'^' + p + r'[\(: /]', msg, re.IGNORECASE):
            return p

    if msg_lower in ("a", "aa", "ok", "temp", "teste", "wip"):
        return "other"

    if re.match(r'^(merge|merged)\b', msg_lower):
        return "merge"

    if re.match(r'^(initial commit|first commit|init)\b', msg_lower):
        return "chore"

    if re.match(r'^(create|add|adiciona|novo|nova|implement|cria)\b', msg_lower):
        return "feat"

    if re.match(r'^(fix|corrig|correc|bugfix|hotfix|resolve)\b', msg_lower):
        return "fix"

    if re.match(r'^(refactor|reorganiz|reestrutur|simplif|extract|move|mover)\b', msg_lower):
        return "refactor"

    if re.match(r'^(update|atualiz|adjust|ajust)\b', msg_lower):
        if files:
            exts = {os.path.splitext(f)[1].lower() for f in files}
            names = {os.path.basename(f).lower() for f in files}
            if exts <= {".css", ".scss", ".less"}:
                return "style"
            if exts <= {".md", ".txt", ".rst"} or "readme" in " ".join(names):
                return "docs"
            if any(n in ("package.json", "tsconfig.json", ".env", "vite.config.ts", "vercel.json") for n in names):
                return "chore"
        return "feat"

    if re.match(r'^(delete|remove|remov|delet)\b', msg_lower):
        return "refactor"

    if re.match(r'^(doc|readme|changelog)\b', msg_lower):
        return "docs"

    if re.match(r'^(style|estilo|css|layout|design|ui)\b', msg_lower):
        return "style"

    if re.match(r'^(test|spec|testes)\b', msg_lower):
        return "test"

    if re.match(r'^(config|setup|install|dep|dependenc|bump|version)\b', msg_lower):
        return "chore"

    if files:
        exts = {os.path.splitext(f)[1].lower() for f in files}
        names = {os.path.basename(f).lower() for f in files}
        if exts <= {".css", ".scss", ".less"}:
            return "style"
        if exts <= {".md", ".txt", ".rst"}:
            return "docs"
        if all("test" in f.lower() or "spec" in f.lower() for f in files):
            return "test"
        if any(n in ("package.json", "tsconfig.json", ".env", "vercel.json") for n in names):
            return "chore"

    return "other"


BAD_MSGS = {"fix", "update", "wip", "test", "a", "aa", "ok", "ajuste", "temp", "teste"}


def is_bad_commit(msg: str) -> bool:
    if len(msg) < 10:
        return True
    if msg.lower().strip() in BAD_MSGS:
        return True
    return False


def suggest_msg(repo_path: str, commit_hash: str) -> str:
    out = run_cmd('git -C "' + repo_path + '" show --stat --format="" ' + commit_hash)
    lines = out.splitlines()[:5]
    files = [l.split("|")[0].strip() for l in lines if "|" in l]
    if not files:
        return "chore: atualiza arquivos do projeto"
    f = files[0]
    ext = os.path.splitext(f)[1]
    if "test" in f.lower() or "spec" in f.lower():
        return "test: atualiza testes em " + os.path.basename(f)
    if ext in [".md", ".txt"]:
        return "docs: atualiza documentacao"
    if "package.json" in f:
        return "chore: atualiza dependencias"
    scope = os.path.dirname(f).split("/")[-1] or os.path.splitext(os.path.basename(f))[0]
    return "feat(" + scope + "): implementa alteracoes em " + os.path.basename(f)


def _parse_commits_from_log(raw: str) -> list:
    """Extrai commits de output do git log com --numstat."""
    commits = []
    if not raw:
        return commits
    blocks = re.split(r'\n(?=[0-9a-f]{6,}\|\|\|)', raw)
    for block in blocks:
        lines = block.strip().splitlines()
        if not lines:
            continue
        parts = lines[0].split("|||")
        if len(parts) < 6:
            continue
        h, msg, date_str, hour_str, time_str, author = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]
        try:
            hour = int(hour_str)
        except Exception:
            hour = 0
        la, lr = 0, 0
        file_list = []
        for sl in lines[1:]:
            sl = sl.strip()
            m = re.match(r'^(\d+)\s+(\d+)\s+(.+)', sl)
            if m:
                la += int(m.group(1))
                lr += int(m.group(2))
                file_list.append(m.group(3).strip())
            elif re.match(r'^-\s+-\s+', sl):
                fname = re.sub(r'^-\s+-\s+', '', sl).strip()
                if fname:
                    file_list.append(fname)
        ctype = get_commit_type(msg, file_list if file_list else None)
        commits.append({
            "hash": h, "msg": msg, "date": date_str, "hour": hour, "time": time_str,
            "type": ctype, "author": author, "linesAdded": la, "linesRemoved": lr
        })
    return commits


def process_repo(repo_path: str) -> dict:
    group, name = get_group_name(repo_path)
    fmt = "%h|||%s|||%ad|||%ae"
    date_fmt = "%Y-%m-%d|||%H|||%H:%M"
    since_arg = str(MAX_HISTORY_DAYS) + " days ago"

    raw = run_cmd(
        'git -C "' + repo_path + '" log --since="' + since_arg + '" --format="' + fmt + '" --date=format:"' + date_fmt + '" --numstat',
        timeout=60
    )

    all_commits = _parse_commits_from_log(raw)

    commit_types_total = {"feat": 0, "fix": 0, "refactor": 0, "chore": 0, "docs": 0, "perf": 0, "test": 0, "revert": 0, "other": 0}
    for c in all_commits:
        t = c["type"] if c["type"] in commit_types_total else "other"
        commit_types_total[t] += 1

    week_commits = [c for c in all_commits if c["date"] >= (TODAY - timedelta(days=6)).strftime("%Y-%m-%d")]

    bad_commits = []
    for c in week_commits:
        if is_bad_commit(c["msg"]):
            bad_commits.append({
                "hash": c["hash"], "msg": c["msg"], "date": c["date"],
                "fixCommand": 'git -C "' + repo_path + '" commit --amend --no-edit',
                "suggestedMsg": suggest_msg(repo_path, c["hash"]),
                "warning": "Requer git push --force-with-lease apos executar."
            })

    files_changed = sum(c["linesAdded"] + c["linesRemoved"] for c in week_commits)

    tf_out = run_cmd(
        'git -C "' + repo_path + '" log --since="7 days ago" --name-only --pretty=format:""'
    )
    file_counter: Counter = Counter()
    for line in tf_out.splitlines():
        line = line.strip()
        if line:
            file_counter[line] += 1
    top_files = [{"file": f, "count": c} for f, c in file_counter.most_common(10)]

    lc_out = run_cmd('git -C "' + repo_path + '" log -1 --format="%ci|||%s"')
    last_commit_date, last_commit_msg = "", ""
    if lc_out and "|||" in lc_out:
        p = lc_out.split("|||", 1)
        last_commit_date, last_commit_msg = p[0].strip(), p[1].strip()

    br_out = run_cmd('git -C "' + repo_path + '" branch --no-merged main')
    if not br_out:
        br_out = run_cmd('git -C "' + repo_path + '" branch --no-merged master')
    branches = [b.strip().lstrip("* ") for b in br_out.splitlines() if b.strip()]

    weekly_avg = round(len(all_commits) / (MAX_HISTORY_DAYS / 7), 2) if all_commits else 0.0

    dates_out = run_cmd('git -C "' + repo_path + '" log --format="%ad" --date=format:"%Y-%m-%d"')
    commit_dates = set(l.strip() for l in dates_out.splitlines() if l.strip())
    streak = 0
    check = TODAY
    while check.strftime("%Y-%m-%d") in commit_dates:
        streak += 1
        check -= timedelta(days=1)

    hm_out = run_cmd('git -C "' + repo_path + '" log --since="28 days ago" --format="%ad" --date=format:"%a|||%H"')
    hm_dict: dict = {}
    for line in hm_out.splitlines():
        if "|||" not in line:
            continue
        p = line.split("|||")
        if len(p) < 2:
            continue
        try:
            key = (p[0], int(p[1]))
            hm_dict[key] = hm_dict.get(key, 0) + 1
        except Exception:
            pass
    heatmap = [{"day": k[0], "hour": k[1], "commits": v} for k, v in hm_dict.items()]

    pkg_out = run_cmd('git -C "' + repo_path + '" diff HEAD~1 HEAD -- package.json')
    pkg_lines = []
    for line in pkg_out.splitlines()[:20]:
        if line.startswith(("+", "-")) and not line.startswith(("---", "+++")):
            pkg_lines.append(line)
    pkg_changed = len(pkg_lines) > 0
    pkg_diff = "\n".join(pkg_lines) if pkg_changed else ""

    todos = []
    todo_path = os.path.join(repo_path, "TODO.md")
    if os.path.exists(todo_path):
        try:
            with open(todo_path, "r", encoding="utf-8", errors="replace") as f:
                for i, line in enumerate(f, 1):
                    line = line.strip()
                    if line and not line.startswith("#"):
                        impl = any(line.lower()[:30] in c["msg"].lower() for c in week_commits)
                        todos.append({"text": line, "line": i, "implemented": impl})
        except Exception:
            pass

    days_ago = 9999
    status = "parado"
    if last_commit_date:
        try:
            lc = datetime.fromisoformat(last_commit_date.replace("Z", "+00:00")).replace(tzinfo=None)
            days_ago = (TODAY - lc).days
        except Exception:
            try:
                days_ago = (TODAY - datetime.strptime(last_commit_date[:10], "%Y-%m-%d")).days
            except Exception:
                pass
        if days_ago < 0:
            days_ago = 0
        if days_ago < 30:
            status = "ativo"

    commit_count_week = len(week_commits)
    total_commits = len(all_commits)
    velocity = round(commit_count_week / weekly_avg, 2) if weekly_avg > 0 else 0.0

    weeks_data = []
    for i in range(min(MAX_HISTORY_DAYS // 7, 21)):
        w_end = TODAY - timedelta(days=i * 7)
        w_start = w_end - timedelta(days=6)
        w_start_str = w_start.strftime("%Y-%m-%d")
        w_end_str = w_end.strftime("%Y-%m-%d")
        count = sum(1 for c in all_commits if w_start_str <= c["date"] <= w_end_str)
        weeks_data.append(count)

    return {
        "group": group, "name": name, "path": repo_path,
        "status": status, "daysAgo": days_ago,
        "lastCommitDate": last_commit_date, "lastCommitMsg": last_commit_msg,
        "commitCount": commit_count_week, "totalCommits": total_commits,
        "filesChanged": files_changed,
        "branchCount": len(branches), "todoCount": len(todos),
        "weeklyAverage": weekly_avg, "velocity": velocity, "streak": streak,
        "packageJsonChanged": pkg_changed, "packageJsonDiff": pkg_diff,
        "commitTypes": commit_types_total, "commits": week_commits,
        "allCommits": all_commits,
        "commitsByWeek": weeks_data,
        "topFiles": top_files, "branches": branches,
        "todos": todos, "badCommits": bad_commits, "heatmap": heatmap
    }
