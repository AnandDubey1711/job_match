"""
Hybrid skill / keyword extraction for resume–JD matching.

Pipeline (all job types):
  1. JobBERT (`jjzha/jobbert_skill_extraction`) — NER over full text; best for
     arbitrary domains (finance, marketing, healthcare, etc.) when phrases are
     multi-word. Still used for semantic similarity scores in main.py.
  2. Structured bullets — skills under "Required Skills" / resume Core Skills.
  3. Domain vocabulary scan — explicit IT + HR terms for reliable ATS keywords.
  4. Blocklists — drop JD noise ("salary", "one", "load", …).

Keyword UI uses (2)+(3)+filtered JobBERT. Overall match % still uses
SentenceTransformer + JobBERT embeddings regardless of keyword lists.
"""
import re
import warnings
warnings.filterwarnings("ignore")

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline
from sentence_transformers import SentenceTransformer

from app import config

# ---------------------------------------------------------------------------
# Model loading — happens once at import time
# ---------------------------------------------------------------------------
print(f"Loading SentenceTransformer model ({config.SENTENCE_TRANSFORMER_MODEL})...")
model = SentenceTransformer(config.SENTENCE_TRANSFORMER_MODEL)

EMBEDDING_DIM = model.get_sentence_embedding_dimension()

# Lazy-loaded to save memory until first use
_skill_extractor = None


def get_skill_extractor():
    global _skill_extractor
    if _skill_extractor is None:
        print(f"Loading JobBERT skill extractor ({config.JOBBERT_MODEL})...")
        _skill_extractor = pipeline(
            "token-classification",
            model=config.JOBBERT_MODEL,
            aggregation_strategy="simple",
        )
    return _skill_extractor


# ---------------------------------------------------------------------------
# Skill extraction helpers
# ---------------------------------------------------------------------------

_JD_VERB_PREFIXES = frozenset({
    "design", "develop", "build", "work", "collaborate", "implement",
    "create", "manage", "lead", "support", "ensure", "maintain", "drive",
    "deliver", "partner", "assist", "provide", "perform", "identify",
})

_ACRONYMS = frozenset({
    "api", "aws", "sql", "nlp", "ml", "ai", "ci", "cd", "etl", "gpu",
    "llm", "devops", "php", "css", "html", "json", "rest", "grpc", "sdk",
    "sso", "jwt", "oauth", "tcp", "udp", "http", "https", "dns", "vpn",
    "iam", "s3", "ec2", "rds", "eks", "gke", "vpc", "cdn", "saas", "paas",
    "ios", "dba", "orm", "mvc", "mvp", "tdd", "bdd", "qa", "ui", "ux",
})

# Common English / HR words that resume-parser wrongly tags as "skills" on JDs.
_GENERIC_BLOCKLIST = frozenset({
    "one", "two", "three", "plus", "load", "ideal", "salary", "health",
    "team", "work", "year", "years", "role", "job", "company", "benefits",
    "remote", "office", "full", "time", "part", "able", "strong", "good",
    "great", "best", "high", "low", "new", "old", "well", "including",
    "within", "using", "used", "based", "related", "other", "more", "less",
    "must", "should", "will", "can", "may", "our", "your", "you", "we",
    "they", "them", "their", "this", "that", "these", "those", "with",
    "from", "into", "about", "over", "under", "between", "across", "during",
    "after", "before", "while", "when", "where", "what", "which", "who",
    "how", "why", "all", "any", "each", "every", "both", "few", "many",
    "some", "such", "only", "own", "same", "than", "too", "very", "just",
    "also", "back", "even", "here", "there", "then", "now", "out", "off",
    "day", "days", "week", "weeks", "month", "months", "hour", "hours",
    "pay", "paid", "bonus", "equity", "stock", "visa", "sponsor", "location",
    "hybrid", "onsite", "on-site", "preferred", "required", "minimum",
    "maximum", "degree", "bachelor", "master", "phd", "education",
    "experience", "responsibilities", "requirements", "qualifications",
    "description", "position", "candidate", "employees", "culture", "diversity",
    "equal", "opportunity", "employer", "applicant", "apply", "join",
    "looking", "seeking", "hire", "hiring", "open", "opening", "level",
    "senior", "junior", "mid", "lead", "staff", "principal", "manager",
    "director", "head", "chief", "global", "local", "national", "international",
    "communication", "collaboration", "problem", "solving", "analytical",
    "detail", "oriented", "self", "motivated", "fast", "paced", "environment",
    "startup", "enterprise", "industry", "sector", "market", "client",
    "customers", "stakeholders", "partners", "internal", "external",
    # Block standalone noise only — allow these inside multi-word skills
})

# Single-token blocklist (stricter than phrase blocklist above).
_SINGLE_TOKEN_BLOCKLIST = _GENERIC_BLOCKLIST | frozenset({
    "communication", "collaboration", "problem", "solving", "analytical",
    "detail", "oriented", "multitasking", "confidentiality", "professionalism",
})

_IT_TERMS = frozenset({
    # Languages
    "python", "java", "javascript", "typescript", "golang", "go", "rust",
    "php", "ruby", "scala", "kotlin", "swift", "perl", "r", "matlab",
    "csharp", "c#", "c++", "cpp", "objective-c", "dart", "elixir", "haskell",
    # Web / mobile
    "react", "reactjs", "vue", "vuejs", "angular", "nextjs", "nuxt", "svelte",
    "html", "css", "sass", "tailwind", "bootstrap", "jquery", "webpack", "vite",
    "nodejs", "node", "express", "nestjs", "django", "flask", "fastapi", "rails",
    "laravel", "spring", "springboot", "hibernate", "asp.net", "dotnet", ".net",
    "android", "ios", "reactnative", "flutter", "xamarin",
    # Data / ML
    "sql", "nosql", "mysql", "postgresql", "postgres", "mongodb", "redis",
    "elasticsearch", "cassandra", "dynamodb", "sqlite", "oracle", "mariadb",
    "snowflake", "bigquery", "redshift", "spark", "hadoop", "hive", "presto",
    "airflow", "dbt", "kafka", "rabbitmq", "celery", "pandas", "numpy",
    "scikit-learn", "sklearn", "pytorch", "tensorflow", "keras", "opencv",
    "mlflow", "kubeflow", "mlops", "nlp", "llm", "langchain", "huggingface",
    "openai", "gpt", "bert", "transformers", "rag", "embeddings", "vector",
    # Cloud / infra
    "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform",
    "ansible", "pulumi", "cloudformation", "helm", "istio", "nginx", "apache",
    "linux", "unix", "bash", "shell", "powershell", "vmware", "hypervisor",
    "serverless", "lambda", "ecs", "eks", "fargate", "s3", "ec2", "rds",
    "cloudwatch", "vpc", "iam", "cdn", "cloudfront", "route53",
    # DevOps / tools
    "git", "github", "gitlab", "bitbucket", "jenkins", "circleci", "travis",
    "github-actions", "gitlab-ci", "argocd", "spinnaker", "prometheus", "grafana",
    "datadog", "splunk", "elk", "kibana", "logstash", "sentry", "sonarqube",
    "jira", "confluence", "figma", "postman", "swagger", "openapi",
    "devops", "ci", "cd", "cicd", "agile", "scrum", "kanban",
    # APIs / architecture
    "api", "rest", "graphql", "grpc", "microservices", "soa", "event-driven",
    "websocket", "oauth", "jwt", "sso", "ldap", "saml",
    # Security
    "security", "cybersecurity", "encryption", "firewall", "penetration",
    "vulnerability", "compliance", "gdpr", "hipaa", "soc2",
    # Testing
    "testing", "selenium", "cypress", "playwright", "jest", "pytest", "junit",
    "mocha", "cucumber", "tdd", "bdd",
    # Other tech
    "blockchain", "solidity", "ethereum", "web3", "iot", "embedded", "fpga",
    "cuda", "gpu", "tpu", "sap", "salesforce", "servicenow", "sharepoint",
    "powerbi", "tableau", "looker", "etl", "elt", "pipeline", "datawarehouse",
    "microservice", "container", "orchestration", "monitoring", "observability",
    "fullstack", "full-stack",
})

_IT_PHRASES = (
    "machine learning", "deep learning", "computer vision", "natural language",
    "data science", "data engineering", "data analysis", "business intelligence",
    "cloud computing", "distributed systems", "system design", "object oriented",
    "test driven", "continuous integration", "continuous delivery", "infrastructure as code",
    "prompt engineering", "large language", "vector database", "message queue",
    "rest api", "web services", "version control", "pair programming",
)

_HR_TERMS = frozenset({
    "hrms", "ats", "hcm", "recruitment", "recruiting", "recruiter",
    "talent", "acquisition", "onboarding", "offboarding", "payroll", "appraisal",
    "appraisals", "linkedin", "labor", "labour",
    "grievance", "grievances", "workforce", "retention", "attrition",
    "sourcing", "shortlist", "shortlisting",
    "excel", "sheets", "zoho", "keka", "bamboohr", "workday",
    "pf", "esic", "chrp", "pgdm", "mba",
})

# Mentioned in JD prose (interview process, HR round) — not DevOps/eng skills as lone keywords.
_HR_PROCESS_STANDALONE = frozenset({
    "hr", "interview", "interviews", "screening", "hiring", "coordination",
    "scheduling", "documentation", "legal", "engagement", "negotiation",
    "offer", "joining", "exit", "orientation", "induction", "attendance",
    "leave", "benefits", "wellness", "referrals", "portals", "records",
    "policies", "policy", "audit", "compliance", "analytics", "kpi", "kpis",
})

_HR_PHRASES = (
    "human resources", "talent acquisition", "employee relations", "employee engagement",
    "performance management", "hr operations", "payroll coordination", "labor law",
    "labour law", "labor laws", "labour laws", "time to hire", "time-to-hire",
    "organizational development", "organisation development", "workforce planning",
    "conflict resolution", "grievance handling", "campus hiring", "technical hiring",
    "technical recruitment", "employee lifecycle", "hr policies", "hr documentation",
    "employee onboarding", "employee offboarding", "offer letter", "offer letters",
    "job portals", "interview coordination", "recruitment tracker", "hr analytics",
    "hr reporting", "employee retention", "employee satisfaction", "performance appraisal",
    "performance review", "performance reviews", "leave management", "attendance management",
    "payroll administration", "employee benefits", "hr compliance", "labor regulations",
    "labour regulations", "ms excel", "google sheets", "hrms tools", "ats tools",
    "end to end recruitment", "end-to-end recruitment", "organizational standards",
    "policy implementation", "audit preparation", "employee records",
)

_DOMAIN_PHRASES = _IT_PHRASES + _HR_PHRASES
_DOMAIN_TERMS = _IT_TERMS | _HR_TERMS
# Vocabulary scan: skip process/admin tokens unless they appear inside a skill phrase.
_DOMAIN_TERMS_FOR_SCAN = _DOMAIN_TERMS - _HR_PROCESS_STANDALONE

_BULLET_LINE = re.compile(r"^[\*\-\u2022\u25cf]\s+(.+)$", re.IGNORECASE)
_SECTION_SKILL_HINT = re.compile(
    r"(skills?|qualifications|requirements|tools|competencies|technical)",
    re.IGNORECASE,
)
_SECTION_SKIP_HINT = re.compile(
    r"(interview\s+process|what\s+we\s+offer|key\s+performance|kpi|benefits|"
    r"about\s+(the\s+)?(role|company)|equal\s+opportunity|sample\s+responsibilities|"
    r"employment\s+type|location|nice\s+to\s+have\s*$)",
    re.IGNORECASE,
)


def _tokenize_for_match(text: str) -> str:
    return re.sub(r"[^a-z0-9+#.\-\s]", " ", text.lower())


def _scan_vocab_in_text(text: str, phrases: tuple[str, ...], terms: frozenset[str]) -> list[str]:
    if not text:
        return []

    normalized = _tokenize_for_match(text)
    found: list[str] = []
    seen: set[str] = set()

    for phrase in phrases:
        if phrase in normalized and phrase not in seen:
            seen.add(phrase)
            found.append(phrase)

    for term in sorted(terms, key=len, reverse=True):
        pattern = rf"\b{re.escape(term)}\b"
        if re.search(pattern, normalized) and term not in seen:
            seen.add(term)
            found.append(term)

    return found


def extract_domain_terms_from_text(text: str) -> list[str]:
    """Find known IT and HR skill terms/phrases (not interview/HR-process noise)."""
    return _scan_vocab_in_text(text, _DOMAIN_PHRASES, _DOMAIN_TERMS_FOR_SCAN)


def _split_bullet_item(item: str) -> list[str]:
    item = re.sub(r"[\*#]+$", "", item.strip()).strip(" .")
    if not item or len(item) < 3:
        return []

    parts: list[str] = []
    for segment in re.split(r"\s*(?:&|,|;|/|\|)\s*", item):
        segment = segment.strip(" .")
        if 3 <= len(segment) <= 50:
            parts.append(segment)
    return parts or ([item] if 3 <= len(item) <= 50 else [])


def extract_bullet_skills_from_text(text: str) -> list[str]:
    """Extract skill-like phrases from markdown/list lines in JDs and resumes."""
    if not text:
        return []

    skills: list[str] = []
    in_skill_section = False
    in_skip_section = False

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("#"):
            in_skip_section = bool(_SECTION_SKIP_HINT.search(line))
            in_skill_section = (
                not in_skip_section and bool(_SECTION_SKILL_HINT.search(line))
            )
            continue

        if _SECTION_SKIP_HINT.search(line):
            in_skip_section = True
            in_skill_section = False
            continue

        if _SECTION_SKILL_HINT.search(line) and not line.startswith(("-", "*", "•")):
            in_skip_section = False
            in_skill_section = True
            continue

        bullet_match = _BULLET_LINE.match(line)
        if in_skip_section:
            continue

        if bullet_match or (in_skill_section and line.startswith(("-", "*", "•"))):
            content = bullet_match.group(1) if bullet_match else line.lstrip("-*• ").strip()
            for part in _split_bullet_item(content):
                skills.append(part)
            continue

        # Comma-separated skill lines (common on resumes): "A, B, C"
        if in_skill_section and "," in line and len(line) < 120:
            if not any(ch.isdigit() for ch in line[:8]):
                for part in _split_bullet_item(line):
                    skills.append(part)

    return skills


def _has_domain_signal(tokens: list[str], joined: str) -> bool:
    if joined in _DOMAIN_PHRASES or any(phrase in joined for phrase in _DOMAIN_PHRASES):
        return True
    hits = sum(
        1
        for t in tokens
        if t in _DOMAIN_TERMS_FOR_SCAN or t in _ACRONYMS or "." in t or "+" in t or "#" in t
    )
    return hits >= 1


def is_valid_professional_keyword(skill: str, *, from_bullet: bool = False) -> bool:
    """Return True for genuine professional skills (IT, HR, tools, etc.)."""
    normalized = sanitize_skill_phrase(skill, apply_domain_filter=False)
    if not normalized:
        return False

    tokens = [t.lower() for t in normalized.split()]
    joined = " ".join(tokens)

    if len(tokens) == 1:
        token = tokens[0]
        if token in _SINGLE_TOKEN_BLOCKLIST or token in _HR_PROCESS_STANDALONE:
            return False
        if token in _DOMAIN_TERMS_FOR_SCAN or token in _ACRONYMS:
            return True
        if re.match(r"^[a-z0-9+#.]+$", token) and ("." in token or "+" in token or "#" in token):
            return True
        return from_bullet and len(token) >= 4 and token.isalpha()

    if all(t in _GENERIC_BLOCKLIST for t in tokens):
        return False
    if len(tokens) >= 4 and tokens[0] in _JD_VERB_PREFIXES:
        return False

    if _has_domain_signal(tokens, joined):
        return True

    if from_bullet and 2 <= len(tokens) <= 5:
        substantive = [t for t in tokens if t not in _GENERIC_BLOCKLIST and len(t) > 2]
        return len(substantive) >= 2

    return False


def is_valid_jobbert_skill(skill: str) -> bool:
    """
    Looser filter for JobBERT NER output — keeps cross-domain phrases
    (e.g. financial modeling, digital marketing) while dropping junk tokens.
    """
    normalized = sanitize_skill_phrase(skill, apply_domain_filter=False)
    if not normalized:
        return False

    tokens = [t.lower() for t in normalized.split()]
    joined = " ".join(tokens)

    if all(t in _GENERIC_BLOCKLIST for t in tokens):
        return False
    if len(tokens) >= 4 and tokens[0] in _JD_VERB_PREFIXES:
        return False

    if len(tokens) == 1:
        token = tokens[0]
        if token in _SINGLE_TOKEN_BLOCKLIST or token in _HR_PROCESS_STANDALONE:
            return False
        return token in _DOMAIN_TERMS_FOR_SCAN or token in _ACRONYMS

    if _has_domain_signal(tokens, joined):
        return True

    substantive = [t for t in tokens if t not in _GENERIC_BLOCKLIST and len(t) > 2]
    return len(tokens) >= 2 and len(substantive) >= 2


def is_valid_keyword_for_match(skill: str) -> bool:
    """Accept keyword if it passes any extraction path's rules."""
    return is_valid_professional_keyword(skill) or is_valid_jobbert_skill(skill)


# Backwards-compatible alias
is_valid_it_keyword = is_valid_professional_keyword


def build_resume_keywords(
    resume_text: str,
    jobbert_skills: list[str],
    parser_skills: list[str],
) -> list[str]:
    terms = extract_domain_terms_from_text(resume_text)
    for item in extract_bullet_skills_from_text(resume_text):
        if is_valid_professional_keyword(item, from_bullet=True):
            terms.append(item)
    for skill in jobbert_skills:
        if is_valid_jobbert_skill(skill):
            terms.append(skill)
    for skill in parser_skills:
        if is_valid_professional_keyword(skill) or is_valid_jobbert_skill(skill):
            terms.append(skill)
    return _dedupe_skills(terms)


def build_jd_keywords(jd_text: str, jobbert_skills: list[str]) -> list[str]:
    """JD keywords: domain scan + structured bullets + JobBERT (no resume-parser on JD)."""
    terms = extract_domain_terms_from_text(jd_text)
    for item in extract_bullet_skills_from_text(jd_text):
        if is_valid_professional_keyword(item, from_bullet=True):
            terms.append(item)
    for skill in jobbert_skills:
        if is_valid_jobbert_skill(skill):
            terms.append(skill)
    return _dedupe_skills(terms)


def sanitize_skill_phrase(skill: str, *, apply_domain_filter: bool = True) -> str | None:
    """Normalize a skill/keyword for display and comparison."""
    s = re.sub(r"[\*#|,;.:]+$", "", (skill or "").strip())
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s*-\s*", " ", s)
    if not s or len(s) < 2:
        return None
    if len(s) > 42:
        return None

    words = s.split()
    if len(words) > 5:
        return None
    if not any(c.isalpha() for c in s):
        return None
    if "##" in s:
        return None
    if s.endswith("-") or s.endswith("In"):
        return None

    lower = s.lower()
    if len(words) >= 4 and words[0] in _JD_VERB_PREFIXES:
        return None
    if lower.startswith(("with ", "and ", "or ", "the ", "a ", "an ")):
        return None

    if apply_domain_filter and not is_valid_professional_keyword(s):
        return None

    return s


def format_skill_label(skill: str) -> str | None:
    normalized = sanitize_skill_phrase(skill)
    if not normalized:
        return None

    parts = normalized.split()
    formatted: list[str] = []
    for part in parts:
        token = part.lower()
        if token in _ACRONYMS or (len(token) <= 4 and token in _DOMAIN_TERMS):
            formatted.append(token.upper() if len(token) <= 4 else token.capitalize())
        elif token == "hr":
            formatted.append("HR")
        else:
            formatted.append(part.capitalize())
    return " ".join(formatted)


def prepare_keyword_lists(
    skills: list[str], *, max_items: int = 24
) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for skill in skills:
        label = format_skill_label(skill)
        if not label:
            continue
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(label)

    cleaned.sort(key=lambda item: (len(item.split()), len(item)))
    return cleaned[:max_items]


def clean_jobbert_output(skills: list[str]) -> list[str]:
    cleaned = []
    for s in skills:
        normalized = sanitize_skill_phrase(s, apply_domain_filter=False)
        if not normalized or not is_valid_jobbert_skill(normalized):
            continue
        cleaned.append(normalized)
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

def _normalize_skill(skill: str) -> str:
    return " ".join(skill.lower().split())


# Canonical skill aliases for skill-to-skill matching (not just substring).
_SKILL_ALIASES: dict[str, frozenset[str]] = {
    "postgres": frozenset({"postgresql", "psql"}),
    "postgresql": frozenset({"postgres", "psql"}),
    "aws": frozenset({"amazon web services", "amazon web service"}),
    "kubernetes": frozenset({"k8s"}),
    "k8s": frozenset({"kubernetes"}),
    "gitlab": frozenset({"git lab"}),
    "github": frozenset({"git hub"}),
    "nodejs": frozenset({"node.js", "node js"}),
    "node": frozenset({"nodejs", "node.js"}),
    "javascript": frozenset({"js"}),
    "typescript": frozenset({"ts"}),
    "golang": frozenset({"go"}),
    "go": frozenset({"golang"}),
    "excel": frozenset({"ms excel", "microsoft excel"}),
    "ms excel": frozenset({"excel", "microsoft excel"}),
    "google sheets": frozenset({"sheets", "google sheet"}),
    "sheets": frozenset({"google sheets"}),
    "ci": frozenset({"continuous integration"}),
    "cd": frozenset({"continuous delivery", "continuous deployment"}),
    "cicd": frozenset({"ci cd", "ci/cd"}),
    "ml": frozenset({"machine learning"}),
    "machine learning": frozenset({"ml"}),
    "nlp": frozenset({"natural language processing"}),
    "react": frozenset({"reactjs", "react.js"}),
    "vue": frozenset({"vuejs", "vue.js"}),
    "angular": frozenset({"angularjs"}),
    "docker": frozenset({"containerization", "containers"}),
    "terraform": frozenset({"iac", "infrastructure as code"}),
    "human resources": frozenset({"hr"}),
    "hr": frozenset({"human resources"}),
}

_SEMANTIC_SKILL_THRESHOLD = 0.72


def _skill_variants(skill: str) -> set[str]:
    base = _normalize_skill(skill)
    if not base:
        return set()

    variants = {base, base.replace(".", ""), base.replace("-", " ")}
    if base in _SKILL_ALIASES:
        variants |= {_normalize_skill(a) for a in _SKILL_ALIASES[base]}

    for canonical, aliases in _SKILL_ALIASES.items():
        alias_norms = {_normalize_skill(a) for a in aliases} | {canonical}
        if base in alias_norms:
            variants |= alias_norms

    return {v for v in variants if len(v) >= 2 or v in _ACRONYMS or v in _DOMAIN_TERMS_FOR_SCAN}


def _variants_overlap(left: set[str], right: set[str]) -> bool:
    if left & right:
        return True
    for a in left:
        for b in right:
            if a == b or (len(a) >= 3 and len(b) >= 3 and (a in b or b in a)):
                return True
            a_tokens = set(a.split())
            b_tokens = set(b.split())
            overlap = a_tokens & b_tokens
            if overlap and len(overlap) >= max(1, min(2, min(len(a_tokens), len(b_tokens)))):
                return True
    return False


def _skill_in_text(skill: str, text: str) -> bool:
    if not text:
        return False
    normalized_text = _tokenize_for_match(text)
    for variant in _skill_variants(skill):
        if len(variant) < 2:
            continue
        if re.search(rf"\b{re.escape(variant)}\b", normalized_text):
            return True
    return False


def skill_matches(
    jd_skill: str,
    resume_skills: list[str],
    resume_text: str = "",
) -> bool:
    """Match a JD skill to resume skills (list + full resume text)."""
    jd_variants = _skill_variants(jd_skill)
    if not jd_variants:
        return False

    for resume_skill in resume_skills:
        if _variants_overlap(jd_variants, _skill_variants(resume_skill)):
            return True

    return _skill_in_text(jd_skill, resume_text)


def _dedupe_skills(skills: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for skill in skills:
        normalized = _normalize_skill(skill)
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique.append(skill.strip())
    return unique


def compare_skill_keywords(
    jd_skills: list[str],
    resume_skills: list[str],
    *,
    resume_text: str = "",
    semantic_threshold: float = _SEMANTIC_SKILL_THRESHOLD,
) -> tuple[list[str], list[str]]:
    """
    Skill-to-skill comparison: each JD keyword is checked against resume
    skill list, resume body text, then semantic similarity to closest resume skill.
    """
    jd_unique = [s for s in _dedupe_skills(jd_skills) if is_valid_keyword_for_match(s)]
    resume_unique = [s for s in _dedupe_skills(resume_skills) if is_valid_keyword_for_match(s)]

    matched: list[str] = []
    missing: list[str] = []

    resume_embeddings = None
    if resume_unique:
        resume_embeddings = model.encode(resume_unique, show_progress_bar=False)

    for jd_skill in jd_unique:
        if skill_matches(jd_skill, resume_unique, resume_text=resume_text):
            matched.append(jd_skill)
            continue

        if resume_embeddings is not None and len(resume_embeddings):
            jd_emb = model.encode([jd_skill], show_progress_bar=False)
            sims = cosine_similarity(jd_emb, resume_embeddings)[0]
            if float(sims.max()) >= semantic_threshold:
                matched.append(jd_skill)
                continue

        missing.append(jd_skill)

    return (
        prepare_keyword_lists(matched),
        prepare_keyword_lists(missing),
    )


def build_ai_tip(missing: list[str], overall_score: float) -> str:
    display_missing = prepare_keyword_lists(missing, max_items=5)
    if display_missing:
        preview = ", ".join(display_missing)
        suffix = " and others" if len(missing) > len(display_missing) else ""
        return (
            f"Add these job-description terms where you have real experience: "
            f"{preview}{suffix}. Mirror the posting's phrasing in recent bullet points."
        )
    if overall_score >= 80:
        return (
            "Strong keyword alignment. Fine-tune your summary to echo the role title "
            "and the top requirements from the posting."
        )
    return (
        "Focus on adding the missing keywords naturally into your experience bullet points. "
        "Tailor your resume language to mirror the exact phrasing in the job description "
        "to improve ATS pass rates."
    )


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