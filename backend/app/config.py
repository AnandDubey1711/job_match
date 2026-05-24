"""Application settings loaded from backend/.env."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_FILE)


def _env(key: str, default: str | None = None) -> str | None:
    return os.getenv(key, default)


def _env_bool(key: str, default: bool = False) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_int(key: str, default: int) -> int:
    raw = os.getenv(key)
    return int(raw) if raw is not None else default


def _env_float(key: str, default: float) -> float:
    raw = os.getenv(key)
    return float(raw) if raw is not None else default


def _env_list(key: str, default: str) -> list[str]:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# Server
HOST = _env("HOST", "0.0.0.0")
PORT = _env_int("PORT", 8000)
CORS_ORIGINS = _env_list("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

# Uvicorn
UVICORN_RELOAD = _env_bool("UVICORN_RELOAD", True)
UVICORN_RELOAD_EXCLUDES = _env_list("UVICORN_RELOAD_EXCLUDES", "app/parser.py")

# Storage
UPLOAD_FOLDER = _env("UPLOAD_FOLDER", "user_uploads")
UPLOAD_CHUNK_SIZE_MB = _env_int("UPLOAD_CHUNK_SIZE_MB", 1)

# Scoring
DEFAULT_EXPERIENCE_SCORE = _env_float("DEFAULT_EXPERIENCE_SCORE", 75.0)

# ML models
SENTENCE_TRANSFORMER_MODEL = _env("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
JOBBERT_MODEL = _env("JOBBERT_MODEL", "jjzha/jobbert_skill_extraction")
SPACY_MODEL = _env("SPACY_MODEL", "en_core_web_sm")

# Hugging Face (optional)
HF_TOKEN = _env("HF_TOKEN")
if HF_TOKEN:
    os.environ.setdefault("HF_TOKEN", HF_TOKEN)
    os.environ.setdefault("HUGGING_FACE_HUB_TOKEN", HF_TOKEN)
