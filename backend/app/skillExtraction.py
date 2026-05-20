import warnings
warnings.filterwarnings("ignore")

import numpy as np
from transformers import pipeline
from sentence_transformers import SentenceTransformer

# ---------------------------------------------------------------------------
# Model loading — happens once at import time
# ---------------------------------------------------------------------------
print("Loading SentenceTransformer model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension

# Lazy-loaded to save memory until first use
_skill_extractor = None


def get_skill_extractor():
    global _skill_extractor
    if _skill_extractor is None:
        print("Loading JobBERT skill extractor...")
        _skill_extractor = pipeline(
            "token-classification",
            model="jjzha/jobbert_skill_extraction",
            aggregation_strategy="simple",
        )
    return _skill_extractor


# ---------------------------------------------------------------------------
# Skill extraction helpers
# ---------------------------------------------------------------------------

def clean_jobbert_output(skills: list[str]) -> list[str]:
    cleaned = []
    for s in skills:
        # Skip subword tokens
        if "##" in s:
            continue
        # Skip single-word tokens (too generic)
        if len(s.split()) < 2:
            continue
        # Must contain at least one letter
        if not any(c.isalpha() for c in s):
            continue
        # Drop phrases ending with punctuation/dash artifacts
        if s.strip().endswith("-") or s.strip().endswith("In"):
            continue
        cleaned.append(s)
    return cleaned


def extract_skills_jobbert(text: str) -> list[str]:
    if not text or not text.strip():
        return []

    extractor = get_skill_extractor()

    words = text.split()
    chunk_size = 200
    overlap = 25
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)

    all_skills: set[str] = set()
    for chunk in chunks:
        results = extractor(chunk)
        current_skill: list[str] = []
        for r in results:
            if r["entity_group"] == "B":
                if current_skill:
                    all_skills.add(" ".join(current_skill))
                current_skill = [r["word"]]
            elif r["entity_group"] == "I":
                current_skill.append(r["word"])
        if current_skill:
            all_skills.add(" ".join(current_skill))

    return clean_jobbert_output(list(all_skills))


# ---------------------------------------------------------------------------
# Text encoding
# ---------------------------------------------------------------------------

def encode_long_text(text: str) -> np.ndarray:
    """
    Encode arbitrarily long text by chunking and averaging embeddings.
    Always returns a numpy array of shape (EMBEDDING_DIM,).
    """
    if not text or not text.strip():
        return np.zeros(EMBEDDING_DIM)

    words = text.split()
    chunks = [" ".join(words[i : i + 200]) for i in range(0, len(words), 200)]

    # Batch encode all chunks at once — much faster than one-by-one
    embeddings = model.encode(chunks, batch_size=16, show_progress_bar=False)
    return embeddings.mean(axis=0)