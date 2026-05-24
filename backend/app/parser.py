from __future__ import annotations

import importlib
from functools import lru_cache

import spacy

from app import config

SPACY_MODEL = config.SPACY_MODEL


@lru_cache(maxsize=1)
def ensure_spacy_model() -> None:
    try:
        spacy.load(SPACY_MODEL)
    except OSError as exc:
        raise RuntimeError(
            f"spaCy model '{SPACY_MODEL}' is not installed. "
            "From the backend folder run: uv sync"
        ) from exc


_parser = None


def get_parser():
    global _parser
    if _parser is None:
        ensure_spacy_model()

        original_load = spacy.load

        def patched_load(name, *args, **kwargs):
            if name == SPACY_MODEL:
                return importlib.import_module(SPACY_MODEL).load(*args, **kwargs)
            return original_load(name, *args, **kwargs)

        spacy.load = patched_load

        from resume_parser import resumeparse
        _parser = resumeparse

    return _parser