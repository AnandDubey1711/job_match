# app/resume_utils.py

# chromadb deps

# ignore warning
import warnings
warnings.filterwarnings("ignore")

from dateutil import parser as date_parser
from datetime import datetime
from typing import Optional
import re


def extract_experience_from_resume(text: str) -> Optional[float]:
    """
    Extract total years of experience from resume text.
    Strategy 1: Parse date ranges (e.g. 'Jan 2020 - Mar 2023')
    Strategy 2: Regex for explicit mentions (e.g. '5 years of experience')
    """
    total_months = 0
    now = datetime.now()

    date_range_pattern = re.compile(
        r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{4}|\d{1,2}[/-]\d{4}|\d{4})'
        r'\s*[-–—to]+\s*'
        r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{4}|\d{1,2}[/-]\d{4}|\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow)',
        re.IGNORECASE
    )

    ranges = date_range_pattern.findall(text)
    intervals = []

    for start_str, end_str in ranges:
        try:
            start = date_parser.parse(start_str, default=datetime(now.year, 1, 1))
            if re.match(r'present|current|now', end_str, re.IGNORECASE):
                end = now
            else:
                end = date_parser.parse(end_str, default=datetime(now.year, 12, 31))

            if start > end or start.year < 1970 or end.year > now.year:
                continue

            intervals.append((start, end))
        except Exception:
            continue

    # Merge overlapping intervals to avoid double-counting
    intervals.sort(key=lambda x: x[0])
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append([start, end])

    for start, end in merged:
        diff = (end.year - start.year) * 12 + (end.month - start.month)
        total_months += diff

    if total_months > 0:
        return round(total_months / 12, 1)

    # Fallback: explicit mention in text
    patterns = [
        r'(\d+\.?\d*)\+?\s*years?\s*of\s*(?:total\s*|overall\s*|relevant\s*)?experience',
        r'(\d+\.?\d*)\+?\s*years?\s*(?:of\s*)?(?:work\s*|industry\s*|professional\s*)?experience',
        r'experience\s*(?:of\s*)?(\d+\.?\d*)\+?\s*years?',
        r'(\d+\.?\d*)\+?\s*years?\s*(?:in\s*the\s*industry|in\s*software|in\s*IT)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))

    return None



def extract_experience_from_jd(jd_text: str) -> Optional[float]:
    """Extract required years of experience from JD text."""

    patterns = [
        # range: "3-5 years", "3–5 years", "3 to 5 years"
        r'(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*years?\s*of\s*(?:relevant\s*)?(?:work\s*)?experience',

        r'experience\s*(?:of\s*)?(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*years?',

        # "3+ years of experience"
        r'(\d+)\+\s*years?\s*of\s*(?:relevant\s*)?(?:work\s*)?experience',

        # "X years of experience"
        r'(\d+)\s*years?\s*of\s*(?:relevant\s*)?(?:work\s*)?experience',
        r'(\d+)\s*years?\s*(?:of\s*)?(?:work\s*)?experience',
        r'experience\s*(?:of\s*)?(\d+)\+?\s*years?',

        # "minimum of X years"
        r'minimum\s*(?:of\s*)?(\d+)\s*years?',
        r'at\s*least\s*(\d+)\s*years?',
    ]

    for pattern in patterns:
        match = re.search(pattern, jd_text, re.IGNORECASE)

        if match:
            groups = [g for g in match.groups() if g is not None]

            if len(groups) == 2:
                low, high = float(groups[0]), float(groups[1])
                return round((low + high) / 2, 1)

            elif len(groups) == 1:
                return float(groups[0])

    return None

def assign_experience_score(exp: Optional[float], jd_exp: Optional[float]) -> float:
    
    # both unknown — neutral
    if exp is None and jd_exp is None:
        return 75.0
    
    # candidate has experience but JD has no requirement — bonus
    if jd_exp is None and exp is not None:
        if exp >= 3:
            return 90.0  # seasoned candidate, open role
        elif exp >= 1:
            return 80.0  # some experience, open role
        else:
            return 75.0  # fresher, open role — still fine
    
    # JD has requirement but can't verify candidate experience — penalty
    if exp is None and jd_exp is not None:
        return 40.0  # can't verify, assume weak match
    
    # both known — calculate normally
    if exp == 0 and jd_exp > 1:
        return 20.0
    
    if exp >= jd_exp * 1.2:
        return 100.0
    elif exp >= jd_exp:
        return 90.0
    elif exp >= jd_exp * 0.5:
        return 60.0
    else:
        return 40.0
    
    
def calculate_final_score(
    semantic_score: float,        # resume vs JD full text
    soft_skills_score: float,     # soft skills semantic match
    hard_skills_score: float,     # hard skills semantic match
    experience_score: float,
    jd_exp: Optional[float]
) -> dict:
    
    if jd_exp is None:
        weights = {
            "semantic": 0.30,
            "soft_skills": 0.15,
            "hard_skills": 0.40,
            "experience": 0.15    # lower weight — experience score was a default
        }
    else:
        weights = {
            "semantic": 0.25,
            "soft_skills": 0.15,
            "hard_skills": 0.35,
            "experience": 0.25    # higher weight — we have a real requirement to match
        }
    
    final = (
        weights["semantic"]     * semantic_score +
        weights["soft_skills"]  * soft_skills_score +
        weights["hard_skills"]  * hard_skills_score +
        weights["experience"]   * experience_score
    )
    
    return {
        "final_score": round(final, 1),
        "weights_used": weights,
        "grade": grade(final)
    }

def grade(score: float) -> str:
    if score >= 85:
        return "Excellent Match"
    elif score >= 70:
        return "Good Match"
    elif score >= 55:
        return "Moderate Match"
    elif score >= 40:
        return "Weak Match"
    else:
        return "Poor Match"