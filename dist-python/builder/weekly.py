from config import TODAY, WEEK_START

def compute_week_label(repos_data: list) -> str:
    total = sum(r["commitCount"] for r in repos_data)
    if total < 10:
        return "Semana Tranquila"
    tt = {"feat": 0, "fix": 0, "refactor": 0, "chore": 0}
    for r in repos_data:
        for t in tt:
            tt[t] += r["commitTypes"].get(t, 0)
    for t, label in [
        ("feat", "Semana de Features"),
        ("fix", "Semana de Correcoes"),
        ("refactor", "Semana de Refatoracao"),
        ("chore", "Semana de Manutencao"),
    ]:
        if total > 0 and tt[t] / total > 0.4:
            return label
    return "Semana Intensa"

def build_weekly_json(repos_data: list) -> dict:
    active = sum(1 for r in repos_data if r["commitCount"] > 0)
    stopped = sum(1 for r in repos_data if r["status"] == "parado")
    total_c = sum(r["commitCount"] for r in repos_data)
    total_t = sum(r["todoCount"] for r in repos_data)
    total_b = sum(r["branchCount"] for r in repos_data)
    total_bad = sum(len(r["badCommits"]) for r in repos_data)
    reactivated = [r["name"] for r in repos_data if r["status"] == "reativado"]
    pkg_ch = sum(1 for r in repos_data if r["packageJsonChanged"])
    exclude_keys = {"path", "allCommits", "commitsByWeek"}
    repos_clean = [{k: v for k, v in r.items() if k not in exclude_keys} for r in repos_data]
    return {
        "date": TODAY.strftime("%Y-%m-%d"),
        "weekLabel": compute_week_label(repos_data),
        "period": {"from": WEEK_START.strftime("%d/%m"), "to": TODAY.strftime("%d/%m")},
        "summary": {
            "totalRepos": len(repos_data), "activeThisWeek": active,
            "stoppedRepos": stopped, "totalCommits": total_c,
            "totalTodos": total_t, "totalBranches": total_b, "totalBadCommits": total_bad
        },
        "reactivated": reactivated,
        "alerts": {"badCommits": total_bad, "packageChanges": pkg_ch, "stoppedProjects": stopped},
        "repos": repos_clean
    }
