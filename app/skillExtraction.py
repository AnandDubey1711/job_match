# ignore warning
import warnings
warnings.filterwarnings("ignore")


from transformers import pipeline

# vectorisation
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("all-MiniLM-L6-v2")


print("Loading model...")
skill_extractor = pipeline(
    "token-classification",
    model="jjzha/jobbert_skill_extraction",
    aggregation_strategy="simple",
)


def clean_jobbert_output(skills: list[str]) -> list[str]:
    cleaned = []
    for s in skills:
        if '##' in s:
            continue
        if len(s.split()) < 2:
            continue
        if not any(c.isalpha() for c in s):
            continue
        # drop phrases ending with punctuation/dash artifacts
        if s.strip().endswith('-') or s.strip().endswith('In'):
            continue
        cleaned.append(s)
    return cleaned


def extract_skills_jobbert(text: str) -> list[str]:
    if not text or not text.strip():
        return []

    words = text.split()
    chunks = []
    chunk_size = 200  # reduced from 400
    overlap = 25

    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)

    all_skills = set()

    for chunk in chunks:
        results = skill_extractor(chunk)
        current_skill = []

        for r in results:
            if r['entity_group'] == 'B':
                if current_skill:
                    all_skills.add(" ".join(current_skill))
                current_skill = [r['word']]
            elif r['entity_group'] == 'I':
                current_skill.append(r['word'])

        if current_skill:
            all_skills.add(" ".join(current_skill))
    result = clean_jobbert_output(list(all_skills))
    return result


def encode_long_text(text: str) -> list:
    if not text or not text.strip():
        return []
    
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), 200):
        chunk = " ".join(words[i:i + 200])
        chunks.append(chunk)
    
    embeddings = model.encode(chunks)
    return embeddings.mean(axis=0)  # average all chunk vectors
