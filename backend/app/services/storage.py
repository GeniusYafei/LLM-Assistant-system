# backend/app/services/storage.py
import hashlib
import re
import unicodedata
from pathlib import Path
from typing import Tuple
from uuid import UUID

from app.core.config import settings

CHUNK = 1024 * 1024  # 1MB


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _sanitize_filename(name: str, maxlen: int = 120) -> str:
    """
    Generate "safe filenames" (for disk storage), preserving the extension:
    - Replace whitespace characters with underscores
    - Remove problematic symbols: quotes, backticks, ?, *, <, >, |, %, #, &, +, :, ;, {}, etc.
    - Limit total length to avoid excessively long filenames
    - Allow common Chinese, Japanese, and Korean characters; disallow path separators
    """
    # Extract extension and normalize
    name = name.replace("/", "_").replace("\\", "_")
    name = unicodedata.normalize("NFKC", name)
    # Split extension
    if "." in name:
        stem, ext = name.rsplit(".", 1)
        ext = "." + ext
    else:
        stem, ext = name, ""

    # Whitespace -> Underscore
    stem = re.sub(r"\s+", "_", stem)
    # Remove problematic symbols
    stem = re.sub(r"[\"'`?*<>|%#&+:;{}^$@!~=$begin:math:display$$end:math:display$()`]", "", stem)
    # Keep safety symbols（letter number ._-() CJK）
    stem = re.sub(r"[^0-9A-Za-z._\-()\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7a3]", "_", stem)
    # Restrict length
    keep = maxlen - len(ext)
    if keep < 1:
        keep = maxlen
        ext = ""
    stem = stem[:keep] if len(stem) > keep else stem
    # Avoid empty filename
    if not stem:
        stem = "file"

    return stem + ext


def save_upload_to_disk(user_id: UUID, filename: str, fileobj) -> Tuple[str, int, str]:
    """
    Save uploaded file to disk storage.
      - Dictory: {STORAGE_ROOT}/{user_id}/{uuid_hex}_{safe_filename}
      - Return: (storage_url, size_bytes, sha256_hex)
    """
    # Clean filename
    safe_name = _sanitize_filename(filename)
    user_dir = Path(settings.STORAGE_ROOT) / str(user_id)
    ensure_dir(user_dir)

    # Use sha256 prefix to avoid too many files in one directory
    prefix = hashlib.sha256(safe_name.encode("utf-8")).hexdigest()[:8]
    target_path = user_dir / f"{prefix}_{safe_name}"

    sha = hashlib.sha256()
    size = 0
    with open(target_path, "wb") as out:
        while True:
            chunk = fileobj.read(CHUNK)
            if not chunk:
                break
            out.write(chunk)
            size += len(chunk)
            sha.update(chunk)

    # Save storage URL (can be changed later)
    storage_url = str(target_path)
    return storage_url, size, sha.hexdigest()
