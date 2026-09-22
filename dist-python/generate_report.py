#!/usr/bin/env python3
"""Gerador de relatorios semanais de codigo — com geracao retroativa."""
import os, json, datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import timedelta

from config import REPORTS_JSON_DIR, WEEK_REPORTS_DIR, LAST_RUN_FILE, TODAY, MAX_HISTORY_DAYS, load_config
from collector.repos import find_repos, get_group_name
from collector.git_data import process_repo
from builder.weekly import build_weekly_json
from builder.general import build_general_json
from builder.markdown import build_markdown


def split_commits_by_week(repos_data: list) -> dict:
    """Agrupa commits de cada repo por semana (domingo a sabado)."""
    weeks = {}
    num_weeks = MAX_HISTORY_DAYS // 7
    for i in range(num_weeks):
        w_end = TODAY - timedelta(days=i * 7)
        w_start = w_end - timedelta(days=6)
        week_key = w_end.strftime("%Y-%m-%d")
        weeks[week_key] = {
            "start": w_start,
            "end": w_end,
            "repos_data": []
        }

    for repo in repos_data:
        per_week_commits: dict = {k: [] for k in weeks}
        for c in repo.get("allCommits", []):
            cdate = c["date"]
            for wk, winfo in weeks.items():
                if winfo["start"].strftime("%Y-%m-%d") <= cdate <= winfo["end"].strftime("%Y-%m-%d"):
                    per_week_commits[wk].append(c)
                    break

        for wk, winfo in weeks.items():
            wc = per_week_commits[wk]
            commit_types = {"feat": 0, "fix": 0, "refactor": 0, "chore": 0, "docs": 0, "perf": 0, "test": 0, "revert": 0, "other": 0}
            for c in wc:
                t = c["type"] if c["type"] in commit_types else "other"
                commit_types[t] += 1

            bad_commits = []
            from collector.git_data import is_bad_commit
            for c in wc:
                if is_bad_commit(c["msg"]):
                    bad_commits.append({
                        "hash": c["hash"], "msg": c["msg"], "date": c["date"],
                        "fixCommand": "",
                        "suggestedMsg": "",
                        "warning": ""
                    })

            week_repo = {
                "group": repo["group"],
                "name": repo["name"],
                "path": repo.get("path", ""),
                "status": repo["status"],
                "daysAgo": repo["daysAgo"],
                "lastCommitDate": repo["lastCommitDate"],
                "lastCommitMsg": repo["lastCommitMsg"],
                "commitCount": len(wc),
                "totalCommits": repo["totalCommits"],
                "filesChanged": sum(c["linesAdded"] + c["linesRemoved"] for c in wc),
                "branchCount": repo.get("branchCount", 0),
                "todoCount": repo.get("todoCount", 0),
                "weeklyAverage": repo.get("weeklyAverage", 0),
                "velocity": round(len(wc) / repo["weeklyAverage"], 2) if repo.get("weeklyAverage", 0) > 0 else 0.0,
                "streak": repo.get("streak", 0),
                "packageJsonChanged": False,
                "packageJsonDiff": "",
                "commitTypes": commit_types,
                "commits": wc,
                "topFiles": [],
                "branches": [],
                "todos": [],
                "badCommits": bad_commits,
                "heatmap": []
            }
            weeks[wk]["repos_data"].append(week_repo)

    return weeks


def report_progress(percent: int, message: str):
    print(f"PROGRESS:{percent}|{message}", flush=True)


def main():
    report_progress(2, "Iniciando Git Engine...")
    cfg = load_config()
    reports_dir = cfg.get("reportsJsonDir", REPORTS_JSON_DIR)
    week_dir = cfg.get("weekReportsDir", WEEK_REPORTS_DIR)
    os.makedirs(reports_dir, exist_ok=True)
    os.makedirs(week_dir, exist_ok=True)

    report_progress(6, "Descobrindo repositórios...")
    repos = find_repos()
    print(f"  {len(repos)} repositorios encontrados")
    report_progress(10, f"{len(repos)} repositórios encontrados. Coletando commits...")

    if not repos:
        report_progress(100, "Nenhum repositório encontrado para varredura.")
        return

    print("Coletando dados (ultimos 150 dias, async)...")
    repos_data = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(process_repo, r): r for r in repos}
        done = 0
        total = len(futures)
        for fut in as_completed(futures):
            done += 1
            percent = 10 + int((done / max(total, 1)) * 75)
            try:
                result = fut.result()
                repos_data.append(result)
                report_progress(percent, f"[{done}/{total}] {result['group']}/{result['name']} ({result['totalCommits']} commits)")
                if result["totalCommits"] > 0:
                    print(f"  [{done}/{total}] {result['group']}/{result['name']}: {result['totalCommits']} commits")
            except Exception as e:
                report_progress(percent, f"[{done}/{total}] Erro: {e}")
                print(f"  [{done}/{total}] Erro em {futures[fut]}: {e}")

    total_commits = sum(r['totalCommits'] for r in repos_data)
    print(f"\n  Total: {total_commits} commits em {len(repos_data)} repos")

    report_progress(88, "Gerando relatórios semanais retroativos...")
    weeks = split_commits_by_week(repos_data)

    generated = 0
    for week_date in sorted(weeks.keys(), reverse=True):
        winfo = weeks[week_date]
        week_repos = winfo["repos_data"]
        total_wc = sum(r["commitCount"] for r in week_repos)
        if total_wc == 0 and week_date != TODAY.strftime("%Y-%m-%d"):
            continue

        weekly = build_weekly_json(week_repos)
        weekly["date"] = week_date
        weekly["period"] = {
            "from": winfo["start"].strftime("%d/%m"),
            "to": winfo["end"].strftime("%d/%m")
        }

        weekly_path = os.path.join(reports_dir, f"{week_date}.json")
        with open(weekly_path, "w", encoding="utf-8") as f:
            json.dump(weekly, f, ensure_ascii=False, indent=2)
        generated += 1
        print(f"  {week_date}: {total_wc} commits, {sum(1 for r in week_repos if r['commitCount'] > 0)} repos ativos")

    print(f"  {generated} JSONs semanais gerados")

    report_progress(94, "Gerando dashboard geral (general.json)...")
    general = build_general_json(repos_data)
    general_path = os.path.join(reports_dir, "general.json")
    with open(general_path, "w", encoding="utf-8") as f:
        json.dump(general, f, ensure_ascii=False, indent=2)
    print(f"  Salvo: {general_path}")

    report_progress(97, "Gerando relatório Markdown semanal...")
    current_week = weeks.get(TODAY.strftime("%Y-%m-%d"))
    if current_week:
        current_weekly = build_weekly_json(current_week["repos_data"])
        md = build_markdown(current_weekly)
        md_path = os.path.join(week_dir, f"relatorio-semanal-{TODAY.strftime('%Y-%m-%d')}.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"  Salvo: {md_path}")

    with open(LAST_RUN_FILE, "w", encoding="utf-8") as f:
        f.write(datetime.datetime.now().isoformat())

    report_progress(100, f"Varredura concluída! {total_commits} commits em {len(repos_data)} repositórios.")
    print("\nConcluido.")


if __name__ == "__main__":
    main()

