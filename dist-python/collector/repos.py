import os
from config import PROJETOS_BASE, IGNORE_FOLDERS, load_config


def find_repos() -> list[str]:
    cfg = load_config()
    max_depth = cfg.get("maxDepth", 6)
    ignore = set(cfg.get("ignoreFolders", list(IGNORE_FOLDERS)))
    scan_roots = cfg.get("scanRoots", [])
    scan_paths = cfg.get("scanPaths", [])

    repos = []
    seen_repos = set()

    def _walk(current: str, depth: int):
        if depth > max_depth:
            return
        if os.path.isdir(os.path.join(current, ".git")):
            norm_repo = os.path.realpath(current)
            if norm_repo not in seen_repos:
                seen_repos.add(norm_repo)
                repos.append(current)
            return
        try:
            entries = os.listdir(current)
        except (PermissionError, OSError):
            return
        for entry in entries:
            if entry in ignore:
                continue
            full = os.path.join(current, entry)
            if not os.path.isdir(full):
                continue
            _walk(full, depth + 1)

    # 1. Escanear caminhos absolutos adicionais explicitos
    if scan_paths:
        for p in scan_paths:
            if p and os.path.isdir(p):
                _walk(p, 0)

    # 2. Escanear subpastas raiz ou pasta base padrao
    base = PROJETOS_BASE
    if scan_roots:
        for root in scan_roots:
            root_path = os.path.join(base, root) if not os.path.isabs(root) else root
            if os.path.isdir(root_path):
                _walk(root_path, 1)
    elif not scan_paths and os.path.isdir(base):
        _walk(base, 0)

    return repos


def get_group_name(repo_path: str) -> tuple[str, str]:
    cfg = load_config()
    scan_paths = cfg.get("scanPaths", [])
    base = PROJETOS_BASE

    all_bases = [sp for sp in scan_paths if sp]
    if base:
        all_bases.append(base)

    rp_norm = os.path.normpath(repo_path).replace("\\", "/")

    for b in all_bases:
        b_norm = os.path.normpath(b).replace("\\", "/").rstrip("/")
        if rp_norm == b_norm:
            return "Projetos", os.path.basename(repo_path)
        if rp_norm.startswith(b_norm + "/"):
            rel = rp_norm[len(b_norm) + 1:]
            parts = rel.split("/")
            group = parts[0] if len(parts) > 1 else os.path.basename(b_norm) or "Projetos"
            name = parts[-1]
            return group, name

    # Fallback
    parts = rp_norm.split("/")
    name = parts[-1] if parts else os.path.basename(repo_path)
    group = parts[-2] if len(parts) >= 2 else "Outros"
    return group, name

