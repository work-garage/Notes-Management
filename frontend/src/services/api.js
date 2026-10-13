import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Attach Cognito access token to every request
api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.accessToken?.toString();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Not signed in — requests without auth will fail at the server for protected routes
  }
  return config;
});

// Normalize error responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// ─── Notes API ────────────────────────────────────────────────────────────────

export const getNotes = async ({ search = '', tag = '' } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (tag) params.tag = tag;
  const res = await api.get('/api/notes', { params });
  return res.data.notes;
};

export const createNote = async (data) => {
  const res = await api.post('/api/notes', data);
  return res.data.note;
};

export const updateNote = async (id, data) => {
  const res = await api.put(`/api/notes/${id}`, data);
  return res.data.note;
};

export const deleteNote = async (id) => {
  await api.delete(`/api/notes/${id}`);
};

export const pinNote = async (id) => {
  const res = await api.patch(`/api/notes/${id}/pin`);
  return res.data.note;
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const getMe = async () => {
  const res = await api.get('/api/auth/me');
  return res.data;
};

export const checkHealth = async () => {
  const res = await api.get('/api/health');
  return res.data;
};

export default api;
