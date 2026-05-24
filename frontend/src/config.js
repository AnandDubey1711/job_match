/**
 * Frontend settings from frontend/.env (VITE_* variables).
 */

function requireEnv(name) {
  const value = import.meta.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function envInt(name, fallback) {
  const raw = import.meta.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid number for ${name}: ${raw}`);
  }
  return n;
}

export const API_BASE_URL = requireEnv('VITE_API_BASE_URL');

export const API_ENDPOINTS = {
  UPLOAD_ANALYZE: `${API_BASE_URL}/upload`,
};

export const MAX_FILE_SIZE_MB = envInt('VITE_MAX_FILE_SIZE_MB', 10);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MIN_JD_LENGTH = envInt('VITE_MIN_JD_LENGTH', 50);
export const MAX_JD_LENGTH = envInt('VITE_MAX_JD_LENGTH', 5000);

export const DEV_PORT = envInt('VITE_DEV_PORT', 5173);
