import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (where Zustand persists it)
    const authStorage = localStorage.getItem('triforce-auth');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 errors
    if (error.response?.status === 401) {
      // Clear auth state
      localStorage.removeItem('triforce-auth');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API helper methods
export const apiHelpers = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }),

  getMe: () => api.get('/auth/me'),

  refreshToken: () => api.post('/auth/refresh'),

  // Strava
  getStravaAuthUrl: () => api.get('/strava/auth'),

  getStravaStatus: () => api.get('/strava/status'),

  disconnectStrava: () => api.delete('/strava/disconnect'),

  // Activities (Phase 2)
  getActivities: (params?: { page?: number; limit?: number; sportType?: string }) =>
    api.get('/activities', { params }),

  getActivity: (id: string) => api.get(`/activities/${id}`),

  syncActivities: () => api.post('/activities/sync'),

  // Analytics (Phase 3)
  getPMC: (days?: number) => api.get('/analytics/pmc', { params: { days } }),

  getTriScore: () => api.get('/analytics/tri-score'),

  getReadiness: () => api.get('/analytics/readiness'),
};

export default api;
