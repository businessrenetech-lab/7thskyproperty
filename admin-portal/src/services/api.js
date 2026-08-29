import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const clearStoredSession = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBranch');
  } catch {}
};

const isAuthValidationRequest = (config) => {
  const url = config?.url || '';
  return url === '/auth/me' || url.endsWith('/auth/me');
};

// Request interceptor for adding JWT token
api.interceptors.request.use(
  (config) => {
    let token = null;
    let branchId = null;
    try {
      token = localStorage.getItem('token');
      branchId = localStorage.getItem('selectedBranch');
    } catch {
      // Storage can fail in restricted browser contexts; continue without auth headers.
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (branchId) {
      config.headers['X-Branch-Id'] = branchId;
    }
    // Tell the backend which service line this request is for, derived from the
    // console the user is in (/air-conditioning/* → air_conditioning, else the
    // Water Tank default). The shared controllers scope their data by this.
    try {
      const p = window.location?.pathname || '';
      if (p.includes('/air-conditioning') || p.includes('/air-condition-provider-onboard')) {
        config.headers['X-Service-Line'] = 'air_conditioning';
      }
    } catch { /* non-browser context */ }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error?.response?.status) && isAuthValidationRequest(error?.config)) {
      clearStoredSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
        window.location.replace('/admin/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
