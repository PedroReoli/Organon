import os, json
from datetime import datetime, timedelta

def _detect_projetos_base():
    env_base = os.environ.get("PROJETOS_BASE_DIR")
    if env_base and os.path.isdir(env_base):
        return os.path.normpath(env_base)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dirs = [
        os.path.abspath(os.path.join(current_dir, "..", "..", "..")),
        os.path.abspath(os.path.join(current_dir, "..", "..")),
        os.path.abspath(os.path.join(current_dir, "..")),
        os.getcwd(),
        os.path.abspath(os.path.join(os.getcwd(), "..")),
        os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    ]
    # Procura um diretorio raiz que contenha as colecoes de projetos
    for d in parent_dirs:
        if os.path.isdir(d):
            if any(os.path.isdir(os.path.join(d, sub)) for sub in ["DomusDev", "Autocom3", "Pessoais", "ProcessosSeletivos"]):
                return os.path.normpath(d)
    for d in parent_dirs:
        if os.path.isdir(d):
            return os.path.normpath(d)
    return os.path.normpath(os.getcwd())

PROJETOS_BASE = _detect_projetos_base()

def _detect_output_base():
    env_base = os.environ.get("REPORTS_BASE_DIR")
    if env_base and os.path.isdir(env_base):
        return os.path.normpath(env_base)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(current_dir)

OUTPUT_BASE = _detect_output_base()
REPORTS_JSON_DIR = os.path.join(OUTPUT_BASE, ".reportsjson")
WEEK_REPORTS_DIR = os.path.join(OUTPUT_BASE, ".week-reports")
LAST_RUN_FILE = os.path.join(OUTPUT_BASE, ".last_run")

DEFAULT_SCAN_ROOTS = ["DomusDev", "Pessoais", "Reoli", "Autocom3", "ProcessosSeletivos", "OpenSource", "game"]
IGNORE_FOLDERS = {"Relatorios", "node_modules", ".git"}

TODAY = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
WEEK_START = TODAY - timedelta(days=6)

MAX_HISTORY_DAYS = 150

CONFIG_FILE = os.path.join(OUTPUT_BASE, "reports-config.json")

def load_config():
    """Carrega configuracao do usuario, com fallback para defaults."""
    defaults = {
        "scanRoots": DEFAULT_SCAN_ROOTS,
        "ignoreFolders": list(IGNORE_FOLDERS),
        "maxDepth": 6,
        "minIntervalHours": 1,
        "reportsJsonDir": REPORTS_JSON_DIR,
        "weekReportsDir": WEEK_REPORTS_DIR,
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                user = json.load(f)
            # Se o usuario tiver scanRoots e scanPaths vazios, usa os defaults para nao zerar os dados
            if not user.get("scanRoots") and not user.get("scanPaths"):
                user["scanRoots"] = DEFAULT_SCAN_ROOTS
            defaults.update(user)
        except Exception:
            pass
    return defaults

def save_config(cfg: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
