import tempfile
# imports logic
# Add to imports at top of main.py
from app.experience import extract_experience_from_resume, extract_experience_from_jd, assign_experience_score, calculate_final_score
from app.skillExtraction import extract_skills_jobbert, encode_long_text
from app.parser import get_parser 

from typing import Optional
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form, Body
import uuid
import re
import httpx

# chromadb deps
from sklearn.metrics.pairwise import cosine_similarity

# Reader and path dep
from pypdf import PdfReader
from docx import Document
from bs4 import BeautifulSoup
from pathlib import Path




# variables
app = FastAPI()
folder = "user_uploads"


class JDRequest(BaseModel):
    jd_text: str

# uploading files setup    
@app.post("/upload", status_code=status.HTTP_200_OK)
async def upload_file(file: UploadFile = File(...), jd_text: str = Form(...)):
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = Path(folder)/filename
    file_path.parent.mkdir(parents=True, exist_ok=True)
    parser = get_parser()
    try:
        parsed_text = ""
        text_content = ""
        resume_soft_skills = ""
        jd_soft_skills = ""
        resume_hard_skills = ""
        jd_hard_skills = ""
        experience_score = ""
        candidate_data = {}
        
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(1024*1024):
                buffer.write(chunk)
                
                if file.content_type.startswith("text"):
                    text_content += chunk.decode("utf-8") 

        if file.content_type == "application/pdf":
            # PDF parser
            print("Type is pdf")
            reader = PdfReader(file_path)
            candidate_information = parser.read_file(file_path)

            print("Candiatie ifno", candidate_information)
            with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
                f.write(jd_text)
                temp_path = f.name

            jd_information = parser.read_file(temp_path)
            
            for key, value in candidate_information.items():
                if key in ["name", "email", "mobile_number", "skills", "degree", "no_of_pages", "total_exp"]:
                    candidate_data[key] = value
                
                if key == "skills":
                    skills = candidate_information[key] or []
                    resume_hard_skills = " ".join(skills).lower()  # ← .lower() added

            for key, value in jd_information.items():
                if key == "skills":
                    skills = jd_information[key] or []
                    jd_hard_skills = " ".join(skills).lower()  # ← .lower() added

            
            for page in reader.pages:
                parsed_text += page.extract_text() or ""
            
            resume_soft_skills = extract_skills_jobbert(parsed_text)
            job_skills_data = extract_skills_jobbert(jd_text)
            
            if resume_soft_skills:
                resume_soft_skills = " ".join(resume_soft_skills)
            else:
                resume_soft_skills = ""
                
            if job_skills_data:
                jd_soft_skills = " ".join(job_skills_data)
            else:   
                jd_soft_skills = ""
            
                
            
            resume_experience = extract_experience_from_resume(parsed_text)
            jd_experience_required = extract_experience_from_jd(jd_text)
            
            experience_score = assign_experience_score(resume_experience, jd_experience_required)
                        
        elif file.content_type.startswith("text"):
            # text parser
            print("Type is text")
            with open(file_path, "r", encoding="utf-8") as f:
                parsed_text = f.read()
                
                
        elif file.content_type == "text/html":
            # html parser
            print("Type is HTML")
            with open(file_path, "r", encoding="utf-8") as f:
                html_content = f.read()
                
            soup = BeautifulSoup(html_content, "html.parser")
            parsed_text = soup.get_text()


        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # DOCX parser
            print("Type is docx")
            doc = Document(file_path)
            text = []
            
            for para in doc.paragraphs:
                text.append(para.text)
                
            parsed_text = "\n".join(text)
        
        
        # parsed_text = re.sub(r"[^a-zA-Z0-9\s]", "", parsed_text)
        parsed_text = re.sub(r"\s+", " ", parsed_text).strip()
                
        
        resume_vec = encode_long_text(parsed_text)
        jd_vec = encode_long_text(jd_text)
        
        print("Soft skills", resume_soft_skills)
        resume_skills_vec = encode_long_text(resume_soft_skills)
        job_skills_vec = encode_long_text(jd_soft_skills)
        
        
        resume_hard_skills_vec = encode_long_text(resume_hard_skills)
        jd_hard_skills_vec = encode_long_text(jd_hard_skills)
        
        try:
            res_jd_semantic_score = cosine_similarity([resume_vec], [jd_vec])[0][0]
        except ValueError:
            res_jd_semantic_score = 0.0

        try:
            skills_semantic_score = cosine_similarity([resume_skills_vec], [job_skills_vec])[0][0]
        except ValueError:
            skills_semantic_score = 0.0

        try:
            hard_skill_semantic_score = cosine_similarity([resume_hard_skills_vec], [jd_hard_skills_vec])[0][0]
        except ValueError:
            hard_skill_semantic_score = 0.0

        cosine_score = float(res_jd_semantic_score) * 100
        skills_score = float(skills_semantic_score) * 100
        hard_skill_cosine_score = float(hard_skill_semantic_score) * 100
        
        
        final_score = calculate_final_score(skills_score, cosine_score, hard_skill_cosine_score, experience_score, jd_experience_required)
        
        return {"filename":filename, "file_desc": parsed_text[:100], "job_desc": jd_text[:10], "cosine_score": int(float(res_jd_semantic_score*100)), "skills_cosine_score": int(float(skills_semantic_score*100)), "hard_skills_score": int(float(hard_skill_semantic_score*100)), "experience_score": experience_score, "evaulatin_result": final_score}

    except Exception as e:
          import traceback
          traceback.print_exc()  # full stack trace in terminal
          raise HTTPException(status_code=500, detail=str(e))


def normalize_score(score: float, min_val: float = 0.3, max_val: float = 0.85) -> float:
    normalized = (score - min_val) / (max_val - min_val)
    return round(max(0.0, min(1.0, normalized)) * 100)


def main():
    print("Hello from rag!")


if __name__ == "__main__":
    main()
