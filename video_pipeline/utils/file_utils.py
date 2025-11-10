from pathlib import Path
import os

def to_abs_path(value: str, base: Path) -> Path:
    """
    Convert an env path (absolute or relative) to an absolute Path.
    - Expands ~
    - If relative, resolves relative to `base`
    """
    p = Path(os.path.expandvars(value)).expanduser()
    return p if p.is_absolute() else (base / p).resolve()