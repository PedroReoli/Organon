#!/usr/bin/env python3
"""Indexador local e deterministico de projetos para o Organon."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
IGNORED_DIRS = {
    ".git", ".idea", ".next", ".organon", ".pytest_cache", ".venv",
    "__pycache__", "build", "coverage", "dist", "node_modules", "release", "venv",
}
SOURCE_EXTENSIONS = {
    ".c", ".cpp", ".cs", ".css", ".go", ".html", ".java", ".js", ".jsx",
    ".json", ".kt", ".md", ".php", ".py", ".rb", ".rs", ".scss", ".sql",
    ".swift", ".ts", ".tsx", ".vue", ".yaml", ".yml",
}
IMPORT_PATTERNS = (
    re.compile(r"(?:from\s+|import\s+(?:.+?\s+from\s+)?)[\"']([^\"']+)[\"']"),
    re.compile(r"require\([\"']([^\"']+)[\"']\)"),
    re.compile(r"^\s*from\s+([\w.]+)\s+import\s+", re.MULTILINE),
    re.compile(r"^\s*import\s+([\w.]+)", re.MULTILINE),
)


def node_id(kind: str, value: str) -> str:
    normalized = value.replace("\\", "/")
    return f"{kind}:{normalized}"


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def detect_technologies(root: Path) -> list[str]:
    markers = {
        "package.json": "Node.js",
        "tsconfig.json": "TypeScript",
        "vite.config.ts": "Vite",
        "vite.config.js": "Vite",
        "pyproject.toml": "Python",
        "requirements.txt": "Python",
        "Cargo.toml": "Rust",
        "go.mod": "Go",
        "pom.xml": "Java",
        "build.gradle": "Gradle",
        "docker-compose.yml": "Docker",
        "Dockerfile": "Docker",
    }
    found = {technology for marker, technology in markers.items() if (root / marker).exists()}
    package_path = root / "package.json"
    if package_path.exists():
        try:
            package = json.loads(read_text(package_path))
            dependencies = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
            for dependency, technology in {
                "react": "React", "electron": "Electron", "next": "Next.js",
                "vue": "Vue", "express": "Express", "@nestjs/core": "NestJS",
            }.items():
                if dependency in dependencies:
                    found.add(technology)
        except json.JSONDecodeError:
            pass
    return sorted(found)


def resolve_import(source: Path, raw_import: str, root: Path, known_files: set[str]) -> str | None:
    if not raw_import.startswith((".", "/")):
        return None
    base = (source.parent / raw_import).resolve() if raw_import.startswith(".") else (root / raw_import.lstrip("/"))
    candidates = [base, *[Path(f"{base}{ext}") for ext in SOURCE_EXTENSIONS]]
    candidates.extend(base / f"index{ext}" for ext in SOURCE_EXTENSIONS)
    for candidate in candidates:
        try:
            relative = candidate.relative_to(root).as_posix()
        except ValueError:
            continue
        if relative in known_files:
            return relative
    return None


def build_graph(root: Path) -> dict[str, Any]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if any(part in IGNORED_DIRS for part in path.relative_to(root).parts):
            continue
        if path.is_file() and path.suffix.lower() in SOURCE_EXTENSIONS:
            files.append(path)

    files = sorted(files)[:12000]
    relative_files = {path.relative_to(root).as_posix() for path in files}
    nodes: list[dict[str, Any]] = [{
        "id": node_id("project", "."), "label": root.name, "type": "project",
        "path": ".", "metadata": {"technologies": detect_technologies(root)},
    }]
    edges: list[dict[str, Any]] = []
    directories: set[str] = set()

    for file_path in files:
        relative = file_path.relative_to(root).as_posix()
        parent = Path(relative).parent.as_posix()
        if parent != ".":
            current = Path(parent)
            chain: list[str] = []
            while current.as_posix() != ".":
                chain.append(current.as_posix())
                current = current.parent
            directories.update(chain)
        nodes.append({
            "id": node_id("file", relative), "label": file_path.name, "type": "file",
            "path": relative, "metadata": {"extension": file_path.suffix.lower()},
        })

    for directory in sorted(directories):
        nodes.append({
            "id": node_id("directory", directory), "label": Path(directory).name,
            "type": "directory", "path": directory, "metadata": {},
        })
        parent = Path(directory).parent.as_posix()
        edges.append({
            "source": node_id("directory", parent) if parent != "." else node_id("project", "."),
            "target": node_id("directory", directory), "relation": "contains",
            "origin": "filesystem", "weight": 1,
        })

    for file_path in files:
        relative = file_path.relative_to(root).as_posix()
        parent = Path(relative).parent.as_posix()
        edges.append({
            "source": node_id("directory", parent) if parent != "." else node_id("project", "."),
            "target": node_id("file", relative), "relation": "contains",
            "origin": "filesystem", "weight": 1,
        })
        content = read_text(file_path)
        imports: set[str] = set()
        for pattern in IMPORT_PATTERNS:
            imports.update(pattern.findall(content))
        for raw_import in sorted(imports):
            resolved = resolve_import(file_path, raw_import, root, relative_files)
            if resolved:
                edges.append({
                    "source": node_id("file", relative), "target": node_id("file", resolved),
                    "relation": "imports", "origin": "source", "weight": 2,
                })

    return {
        "schemaVersion": SCHEMA_VERSION,
        "project": {"name": root.name, "path": str(root)},
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "files": len(files), "directories": len(directories),
            "nodes": len(nodes), "edges": len(edges),
            "technologies": detect_technologies(root),
        },
        "nodes": nodes,
        "edges": edges,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria o grafo local de um projeto.")
    parser.add_argument("--project", required=True, help="Diretorio do projeto")
    parser.add_argument("--output", required=True, help="Arquivo graph.json de saida")
    args = parser.parse_args()

    root = Path(args.project).resolve()
    output = Path(args.output).resolve()
    if not root.is_dir():
        raise SystemExit(f"Diretorio invalido: {root}")
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(build_graph(root), ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(output)
    print(str(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
