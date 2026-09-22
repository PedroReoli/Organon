from config import TODAY

def build_markdown(wd: dict) -> str:
    s = wd["summary"]
    repos = wd["repos"]
    active_repos = [r for r in repos if r["commitCount"] > 0]
    stopped_repos = [r for r in repos if r["status"] == "parado"]
    most_active = max(active_repos, key=lambda r: r["commitCount"]) if active_repos else None
    max_streak = max(repos, key=lambda r: r["streak"]) if repos else None
    bad_all = [(r, bc) for r in repos for bc in r["badCommits"]]
    pkg_repos = [r for r in repos if r["packageJsonChanged"]]
    pending_todos = [(r, t) for r in repos for t in r["todos"] if not t["implemented"]]
    L = []
    L.append("# Relatorio Semanal - " + TODAY.strftime("%d/%m/%Y"))
    L.append("## " + wd["weekLabel"] + " - " + wd["period"]["from"] + " a " + wd["period"]["to"])
    L.append("")
    L.append("---")
    L.append("")
    L.append("## Resumo Executivo")
    L.append("")
    L.append("| Repos | Com atividade | Parados 30+ dias | Total commits | TODOs pendentes | Commits ruins |")
    L.append("|-------|--------------|-----------------|---------------|-----------------|---------------|")
    L.append("| " + str(s["totalRepos"]) + " | " + str(s["activeThisWeek"]) + " | " + str(s["stoppedRepos"]) + " | " + str(s["totalCommits"]) + " | " + str(s["totalTodos"]) + " | " + str(s["totalBadCommits"]) + " |")
    L.append("")
    L.append("## Destaques")
    L.append("")
    if most_active:
        L.append("- Projeto mais ativo: **" + most_active["name"] + "** com " + str(most_active["commitCount"]) + " commits (velocity: " + str(most_active["velocity"]) + ")")
    reactivated = wd.get("reactivated", [])
    L.append("- Projetos que voltaram: " + (", ".join(reactivated) if reactivated else "Nenhum"))
    if max_streak and max_streak["streak"] > 0:
        L.append("- Maior streak: **" + max_streak["name"] + "** com " + str(max_streak["streak"]) + " dias consecutivos")
    L.append("")
    L.append("## Alertas")
    L.append("")
    if bad_all:
        L.append("### Commits ruins - sugestoes de correcao")
        L.append("")
        L.append("| Repo | Hash | Mensagem atual | Sugestao | Comando |")
        L.append("|------|------|---------------|----------|---------|")
        for r, bc in bad_all:
            L.append("| " + r["name"] + " | `" + bc["hash"] + "` | " + bc["msg"] + " | " + bc["suggestedMsg"] + " | `git commit --amend` |")
        L.append("")
    if pkg_repos:
        L.append("### Mudancas em package.json")
        L.append("")
        L.append("| Repo | Resumo do diff |")
        L.append("|------|---------------|")
        for r in pkg_repos:
            diff_s = (r["packageJsonDiff"] or "")[:80].replace("\n", " ")
            L.append("| " + r["name"] + " | " + diff_s + " |")
        L.append("")
    if stopped_repos:
        L.append("### Projetos parados ha 30+ dias")
        L.append("")
        L.append("| Projeto | Ultimo commit | Dias parado |")
        L.append("|---------|--------------|-------------|")
        for r in stopped_repos:
            lc = (r["lastCommitDate"] or "N/A")[:10]
            L.append("| " + r["name"] + " | " + lc + " | " + str(r["daysAgo"]) + " |")
        L.append("")
    if pending_todos:
        L.append("## TODOs Pendentes")
        L.append("")
        L.append("| Projeto | Item | Status |")
        L.append("|---------|------|--------|")
        for r, t in pending_todos:
            L.append("| " + r["name"] + " | " + t["text"][:60] + " | Pendente |")
        L.append("")
    L.append("---")
    L.append("")
    L.append("## Atividade Detalhada por Projeto")
    L.append("")
    for r in active_repos:
        L.append("### " + r["group"] + "/" + r["name"])
        L.append("- **Commits:** " + str(r["commitCount"]) + " | **Velocity:** " + str(r["velocity"]) + " | **Streak:** " + str(r["streak"]) + " dias")
        L.append("- **Branches abertas:** " + str(r["branchCount"]))
        L.append("")
        if r["commits"]:
            L.append("| Hash | Mensagem | Data | +Linhas | -Linhas |")
            L.append("|------|----------|------|---------|---------|")
            for c in r["commits"][:20]:
                L.append("| `" + c["hash"] + "` | " + c["msg"][:50] + " | " + c["date"] + " | +" + str(c["linesAdded"]) + " | -" + str(c["linesRemoved"]) + " |")
            L.append("")
        if r["topFiles"]:
            L.append("**Arquivos-chave modificados:**")
            for tf in r["topFiles"][:5]:
                L.append("- `" + tf["file"] + "` (" + str(tf["count"]) + "x)")
            L.append("")
    inactive = [r for r in repos if r["commitCount"] == 0]
    if inactive:
        L.append("## Projetos Sem Atividade Esta Semana")
        L.append("")
        L.append("| Projeto | Ultimo commit | Dias |")
        L.append("|---------|--------------|------|")
        for r in inactive:
            lc = (r["lastCommitDate"] or "N/A")[:10]
            L.append("| " + r["group"] + "/" + r["name"] + " | " + lc + " | " + str(r["daysAgo"]) + " |")
    return "\n".join(L)
