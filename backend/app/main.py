import os
import re
import tempfile
import traceback
import uuid
import warnings
from pathlib import Path
from typing import Optional

from app import config

warnings.filterwarnings("ignore")

import httpx
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pypdf import PdfReader
from docx import Document
from bs4 import BeautifulSoup
from sklearn.metrics.pairwise import cosine_similarity

from app.experience import (
    extract_experience_from_resume,
    extract_experience_from_jd,
    assign_experience_score,
    calculate_final_score,
)
from app.skillExtraction import (
    extract_skills_jobbert,
    encode_long_text,
    compare_skill_keywords,
    build_ai_tip,
    build_jd_keywords,
    build_resume_keywords,
)
from app.parser import get_parser

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI()
UPLOAD_FOLDER = config.UPLOAD_FOLDER
UPLOAD_CHUNK_SIZE = config.UPLOAD_CHUNK_SIZE_MB * 1024 * 1024

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JDRequest(BaseModel):
    jd_text: str


# ---------------------------------------------------------------------------
# PDF text cleaning
# ---------------------------------------------------------------------------

def fix_spaced_pdf_text(text: str) -> str:
    """
    Some PDFs extract as 'T e c h n i c a l  L e a d' with spaces between
    every character.  Detect this pattern and collapse it.
    """
    # If 4+ single-char tokens appear in a row, it's the spaced-char pattern
    if re.search(r"(?<!\w)(\w ){4,}", text):
        # Collapse   "T e c h n i c a l"  →  "Technical"
        text = re.sub(r"(?<=\b)(\w) (?=\w\b)", r"\1", text)
        # Remove any remaining double spaces
        text = re.sub(r" {2,}", " ", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Safe cosine similarity (handles zero/empty vectors gracefully)
# ---------------------------------------------------------------------------

def safe_cosine(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    if vec_a is None or vec_b is None:
        return 0.0
    if np.linalg.norm(vec_a) == 0 or np.linalg.norm(vec_b) == 0:
        return 0.0
    try:
        return float(cosine_similarity([vec_a], [vec_b])[0][0])
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Main upload endpoint
# ---------------------------------------------------------------------------

@app.post("/upload", status_code=status.HTTP_200_OK)
async def upload_file(
    file: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    job_description: Optional[str] = Form(None),
):
    # Support both the original API contract (`file`, `jd_text`) and the
    # frontend contract currently in use (`resume`, `job_description`).
    file = file or resume
    jd_text = jd_text or job_description

    if file is None:
        raise HTTPException(status_code=422, detail="Missing uploaded file. Expected 'file' or 'resume'.")
    if not jd_text:
        raise HTTPException(status_code=422, detail="Missing job description. Expected 'jd_text' or 'job_description'.")

    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = Path(UPLOAD_FOLDER) / filename
    file_path.parent.mkdir(parents=True, exist_ok=True)

    temp_path: Optional[str] = None

    try:
        parser = get_parser()
        parsed_text = ""
        resume_soft_skills = ""
        jd_soft_skills = ""
        resume_hard_skills = ""
        jd_hard_skills = ""
        resume_soft_list: list[str] = []
        jd_soft_list: list[str] = []
        resume_hard_list: list[str] = []
        jd_hard_list: list[str] = []
        experience_score: float = config.DEFAULT_EXPERIENCE_SCORE
        jd_experience_required: Optional[float] = None
        candidate_data: dict = {}

        # ── Save uploaded file to disk ──────────────────────────────────────
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                buffer.write(chunk)

        content_type = file.content_type or ""

        # ── PDF ─────────────────────────────────────────────────────────────
        if content_type == "application/pdf":
            print("[INFO] Parsing PDF")

            # Extract raw text via pypdf
            reader = PdfReader(file_path)
            for page in reader.pages:
                parsed_text += page.extract_text() or ""

            # FIX: collapse character-level spacing that some PDFs produce
            parsed_text = fix_spaced_pdf_text(parsed_text)

            # Resume-parser for structured fields (name, email, skills, …)
            try:
                candidate_information = parser.read_file(str(file_path))
                for key, value in candidate_information.items():
                    if key in ["name", "email", "mobile_number", "degree", "no_of_pages", "total_exp"]:
                        candidate_data[key] = value
                    if key == "skills":
                        skills = value or []
                        resume_hard_list = [str(s) for s in skills if s]
                        resume_hard_skills = " ".join(resume_hard_list).lower()
            except Exception as e:
                print(f"[WARN] resume-parser failed: {e}")

            # JD structured fields via resume-parser (temp file trick)
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".txt", delete=False, encoding="utf-8"
                ) as f:
                    f.write(jd_text)
                    temp_path = f.name

                jd_information = parser.read_file(temp_path)
                for key, value in jd_information.items():
                    if key == "skills":
                        skills = value or []
                        jd_hard_list = [str(s) for s in skills if s]
                        jd_hard_skills = " ".join(jd_hard_list).lower()
            except Exception as e:
                print(f"[WARN] JD resume-parser failed: {e}")

            # Soft-skill extraction via JobBERT
            resume_soft_list = extract_skills_jobbert(parsed_text)
            jd_soft_list = extract_skills_jobbert(jd_text)
            resume_soft_skills = " ".join(resume_soft_list) if resume_soft_list else ""
            jd_soft_skills = " ".join(jd_soft_list) if jd_soft_list else ""

            # Experience scoring
            resume_experience = extract_experience_from_resume(parsed_text)
            jd_experience_required = extract_experience_from_jd(jd_text)
            experience_score = assign_experience_score(resume_experience, jd_experience_required)

            print(f"[INFO] resume_exp={resume_experience}  jd_exp={jd_experience_required}  exp_score={experience_score}")

        # ── Plain text ───────────────────────────────────────────────────────
        elif content_type.startswith("text/plain"):
            print("[INFO] Parsing plain text")
            with open(file_path, "r", encoding="utf-8") as f:
                parsed_text = f.read()

        # ── HTML ─────────────────────────────────────────────────────────────
        elif content_type == "text/html":
            print("[INFO] Parsing HTML")
            with open(file_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            soup = BeautifulSoup(html_content, "html.parser")
            parsed_text = soup.get_text()

        # ── DOCX ─────────────────────────────────────────────────────────────
        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            print("[INFO] Parsing DOCX")
            doc = Document(file_path)
            parsed_text = "\n".join(para.text for para in doc.paragraphs)

        else:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {content_type}")

        # ── Normalise whitespace ─────────────────────────────────────────────
        parsed_text = re.sub(r"\s+", " ", parsed_text).strip()

        if not resume_soft_list:
            resume_soft_list = extract_skills_jobbert(parsed_text)
            jd_soft_list = extract_skills_jobbert(jd_text)
            resume_soft_skills = " ".join(resume_soft_list) if resume_soft_list else ""
            jd_soft_skills = " ".join(jd_soft_list) if jd_soft_list else ""

        if content_type != "application/pdf" and parsed_text:
            resume_experience = extract_experience_from_resume(parsed_text)
            jd_experience_required = extract_experience_from_jd(jd_text)
            experience_score = assign_experience_score(
                resume_experience, jd_experience_required
            )

        if not resume_hard_list:
            try:
                candidate_information = parser.read_file(str(file_path))
                for key, value in candidate_information.items():
                    if key in ["name", "email", "mobile_number", "degree", "no_of_pages", "total_exp"]:
                        candidate_data[key] = value
                    if key == "skills":
                        skills = value or []
                        resume_hard_list = [str(s) for s in skills if s]
                        resume_hard_skills = " ".join(resume_hard_list).lower()
            except Exception as e:
                print(f"[WARN] resume-parser failed: {e}")

        if not jd_hard_list:
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".txt", delete=False, encoding="utf-8"
                ) as f:
                    f.write(jd_text)
                    jd_temp_path = f.name

                jd_information = parser.read_file(jd_temp_path)
                for key, value in jd_information.items():
                    if key == "skills":
                        skills = value or []
                        jd_hard_list = [str(s) for s in skills if s]
                        jd_hard_skills = " ".join(jd_hard_list).lower()
            except Exception as e:
                print(f"[WARN] JD resume-parser failed: {e}")
            finally:
                if "jd_temp_path" in locals() and os.path.exists(jd_temp_path):
                    os.unlink(jd_temp_path)

        # ── Encode all text fields ────────────────────────────────────────────
        resume_vec           = encode_long_text(parsed_text)
        jd_vec               = encode_long_text(jd_text)
        resume_soft_vec      = encode_long_text(resume_soft_skills)
        jd_soft_vec          = encode_long_text(jd_soft_skills)
        resume_hard_vec      = encode_long_text(resume_hard_skills)
        jd_hard_vec          = encode_long_text(jd_hard_skills)

        # ── Cosine similarities (0–100) ───────────────────────────────────────
        cosine_score          = safe_cosine(resume_vec,      jd_vec)       * 100
        skills_score          = safe_cosine(resume_soft_vec, jd_soft_vec)  * 100
        hard_skill_score      = safe_cosine(resume_hard_vec, jd_hard_vec)  * 100

        print(f"[INFO] cosine={cosine_score:.1f}  soft={skills_score:.1f}  hard={hard_skill_score:.1f}")

        # ── FIX: correct argument order ───────────────────────────────────────
        # calculate_final_score(semantic, soft_skills, hard_skills, experience, jd_exp)
        final_score = calculate_final_score(
            semantic_score    = cosine_score,
            soft_skills_score = skills_score,
            hard_skills_score = hard_skill_score,
            experience_score  = experience_score,
            jd_exp            = jd_experience_required,
        )

        overall_score = round(final_score["final_score"])
        jd_keywords = build_jd_keywords(jd_text, jd_soft_list)
        resume_keywords = build_resume_keywords(
            parsed_text, resume_soft_list, resume_hard_list
        )
        matched_keywords, missing_keywords = compare_skill_keywords(
            jd_keywords,
            resume_keywords,
            resume_text=parsed_text,
        )
        ai_tip = build_ai_tip(missing_keywords, overall_score)

        return {
            "filename":         filename,
            "file_desc":        parsed_text[:200],
            "job_desc":         jd_text[:50],
            "cosine_score":     round(cosine_score),
            "skills_cosine_score": round(skills_score),
            "hard_skills_score":   round(hard_skill_score),
            "experience_score":    experience_score,
            "candidate_data":      candidate_data,
            "evaluation_result":   final_score,
            "overall_score":       overall_score,
            "matched_keywords":    matched_keywords,
            "missing_keywords":    missing_keywords,
            "ai_tip":              ai_tip,
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Always clean up the temp JD file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


# ---------------------------------------------------------------------------
# Score normalisation utility (kept for reference)
# ---------------------------------------------------------------------------

def normalize_score(score: float, min_val: float = 0.3, max_val: float = 0.85) -> float:
    normalized = (score - min_val) / (max_val - min_val)
    return round(max(0.0, min(1.0, normalized)) * 100)


def main():
    print("Hello from rag!")


if __name__ == "__main__":
    main()
