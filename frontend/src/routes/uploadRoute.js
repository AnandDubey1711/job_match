import { API_ENDPOINTS } from './api';


const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MIN_JD_LENGTH = 50;
const MAX_JD_LENGTH = 5000;

export function validateResumeFile(file) {
    if (!file) {
        return 'Please upload a resume file before analyzing.';
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.type)) {
        return `Invalid file type "${ext}". Only PDF files are supported right now.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return `File size exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please compress or trim your resume.`;
    }

    return null; // valid
}


export function validateJobDescription(jd) {
    const trimmed = (jd || '').trim();

    if (!trimmed) {
        return 'Please paste a job description before analyzing.';
    }

    if (trimmed.length < MIN_JD_LENGTH) {
        return `Job description is too short (${trimmed.length} chars). Please paste the full description (at least ${MIN_JD_LENGTH} characters).`;
    }

    if (trimmed.length > MAX_JD_LENGTH) {
        return `Job description exceeds the ${MAX_JD_LENGTH} character limit. Please trim it down.`;
    }

    return null; // valid
}


export function validateInputs(file, jobDescription) {
    return validateResumeFile(file) || validateJobDescription(jobDescription);
}


export async function analyzeResumeMatch(file, jobDescription) {
    const validationError = validateInputs(file, jobDescription);
    if (validationError) {
        const err = new Error(validationError);
        err.isValidationError = true;
        throw err;
    }

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription.trim());

    let response;
    try {
        response = await fetch(API_ENDPOINTS.UPLOAD_ANALYZE, {
            method: 'POST',
            body: formData,
        });
    } catch (networkError) {
        const err = new Error(
            'Cannot reach the server. Make sure the backend is running on localhost:8000.'
        );
        err.isNetworkError = true;
        throw err;
    }

    if (!response.ok) {
        let detail = `Server error (${response.status})`;
        try {
            const body = await response.json();
            detail = body?.detail || body?.message || detail;
        } catch (_) {
        }
        const err = new Error(detail);
        err.isServerError = true;
        err.status = response.status;
        throw err;
    }

    return response.json();
}
