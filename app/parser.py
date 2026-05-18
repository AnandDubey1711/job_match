from __future__ import annotations

import importlib
import importlib.util
import subprocess
import sys
from functools import lru_cache

import spacy

SPACY_MODEL = "en_core_web_sm"
SPACY_MODEL_URL = (
    "https://github.com/explosion/spacy-models/releases/download/"
    "en_core_web_sm-2.3.1/en_core_web_sm-2.3.1.tar.gz"
)


@lru_cache(maxsize=1)
def ensure_spacy_model() -> None:
    try:
        spacy.load(SPACY_MODEL)
    except OSError:
        if importlib.util.find_spec(SPACY_MODEL) is None:
            try:
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", SPACY_MODEL_URL],
                    check=True,
                )
            except Exception as exc:
                raise RuntimeError(
                    f"spaCy model 'en_core_web_sm' is required by resume-parser. "
                    f"Install it with: {sys.executable} -m pip install {SPACY_MODEL_URL}"
                ) from exc
        try:
            model_pkg = importlib.import_module(SPACY_MODEL)
            model_pkg.load()
        except Exception as exc:
            raise RuntimeError(
                "spaCy model 'en_core_web_sm' is installed but could not be loaded."
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