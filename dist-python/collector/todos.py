import os

def read_todos(repo_path: str, commits: list) -> list:
    todos = []
    todo_path = os.path.join(repo_path, "TODO.md")
    if not os.path.exists(todo_path):
        return todos
    try:
        with open(todo_path, "r", encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f, 1):
                line = line.strip()
                if line and not line.startswith("#"):
                    impl = any(line.lower()[:30] in c["msg"].lower() for c in commits)
                    todos.append({"text": line, "line": i, "implemented": impl})
    except Exception:
        pass
    return todos
