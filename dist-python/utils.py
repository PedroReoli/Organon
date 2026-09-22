import subprocess, os


def run_cmd(cmd: str, timeout: int = 30) -> str:
    try:
        kwargs = dict(shell=True, capture_output=True, text=True, timeout=timeout)
        if os.name == 'nt':
            kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
        r = subprocess.run(cmd, **kwargs)
        return r.stdout.strip()
    except Exception:
        return ""
