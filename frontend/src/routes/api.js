/**
 * API Route Configuration
 * Base URL points to the backend running on localhost:8000
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
    UPLOAD_ANALYZE: `${BASE_URL}/upload`,
};

export default BASE_URL;
