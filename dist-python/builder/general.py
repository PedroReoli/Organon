from config import TODAY, MAX_HISTORY_DAYS
from datetime import timedelta


def build_general_json(repos_data: list) -> dict:
    """Constroi general.json a partir dos dados coletados dos repos."""
    ct_totals = {"feat": 0, "fix": 0, "refactor": 0, "chore": 0, "docs": 0, "perf": 0, "test": 0, "revert": 0, "other": 0}

    num_weeks = MAX_HISTORY_DAYS // 7
    repos_list = []
    for repo in repos_data:
        for c in repo.get("allCommits", []):
            t = c["type"] if c["type"] in ct_totals else "other"
            ct_totals[t] += 1

        commits_by_week = repo.get("commitsByWeek", [])
        while len(commits_by_week) < num_weeks:
            commits_by_week.append(0)

        repos_list.append({
            "group": repo.get("group", ""),
            "name": repo.get("name", ""),
            "path": repo.get("path", ""),
            "status": repo.get("status", "parado"),
            "daysAgo": repo.get("daysAgo", 0),
            "streak": repo.get("streak", 0),
            "velocity": repo.get("velocity", 0.0),
            "weeklyAverage": repo.get("weeklyAverage", 0),
            "lastCommitMsg": repo.get("lastCommitMsg", ""),
            "lastCommitDate": (repo.get("lastCommitDate", "") or "")[:10],
            "commitsByWeek": commits_by_week[:num_weeks],
            "totalCommits": repo.get("totalCommits", 0),
        })

    total_commits_all = sum(r["totalCommits"] for r in repos_list)

    weekly_totals = []
    for i in range(num_weeks):
        w_date = TODAY - timedelta(days=i * 7)
        week_commits = sum(r["commitsByWeek"][i] for r in repos_list if i < len(r["commitsByWeek"]))
        active_repos = sum(1 for r in repos_list if i < len(r["commitsByWeek"]) and r["commitsByWeek"][i] > 0)
        weekly_totals.append({
            "date": w_date.strftime("%Y-%m-%d"),
            "commits": week_commits,
            "activeRepos": active_repos
        })

    return {
        "updatedAt": TODAY.strftime("%Y-%m-%d"),
        "totalRepos": len(repos_list),
        "totalCommitsAllTime": total_commits_all,
        "commitTypesTotals": ct_totals,
        "repos": repos_list,
        "weeklyTotals": weekly_totals
    }
