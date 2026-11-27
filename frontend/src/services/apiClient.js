/**
 * High-Performance Centralized API Client
 * - Automatic Authorization Header injection
 * - CSRF Double-Submit Header + Cookie credentials support
 * - Automatic Refresh-Token Rotation on 401 (single-flight deduplicated)
 * - In-flight Request Deduplication & Micro-caching (5s TTL)
 */

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal && (!envUrl || envUrl.includes('speshway.site'))) {
      return 'http://localhost:5000/api';
    }
  }
  return envUrl || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const cache = new Map();
const CACHE_TTL_MS = 5000;
const inFlightRequests = new Map();
let activeRefreshPromise = null;

function getCookieValue(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function invalidateApiCache(prefix = '') {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(prefix)) {
      cache.delete(key);
    }
  }
}

async function tryRefreshAccessToken() {
  if (activeRefreshPromise) return activeRefreshPromise;

  activeRefreshPromise = (async () => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('hms_refresh_token') : null;
      const csrfToken = getCookieValue('XSRF-TOKEN');
      const headers = {
        'Content-Type': 'application/json',
        'X-Client-Platform': typeof window !== 'undefined' && window.electronAPI?.isDesktop ? 'desktop' : 'web'
      };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(refreshToken ? { refreshToken } : {})
      });

      if (!res.ok) return null;
      const json = await res.json();
      if (json?.success && json?.data?.token) {
        localStorage.setItem('hms_token', json.data.token);
        if (json.data.refreshToken) {
          localStorage.setItem('hms_refresh_token', json.data.refreshToken);
        }
        if (json.data.user) {
          localStorage.setItem('hms_user', JSON.stringify(json.data.user));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-token-refreshed'));
        }
        return json.data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function apiRequest(path, options = {}, _isRetry = false) {
  const method = (options.method || 'GET').toUpperCase();
  const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;
  const isGet = method === 'GET';
  const bypassCache = options.bypassCache === true;

  let url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  if (options.params && typeof options.params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const cacheKey = `${method}:${url}:${token || ''}`;

  if (!isGet) {
    invalidateApiCache();
  }

  if (isGet && !bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  if (isGet && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Platform': typeof window !== 'undefined' && window.electronAPI?.isDesktop ? 'desktop' : 'web',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const csrfToken = getCookieValue('XSRF-TOKEN');
  if (csrfToken && !isGet) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: 'include'
      });

      // Automatic silent refresh-token rotation on 401
      const isAuthEndpoint = path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/refresh');
      if (response.status === 401 && !_isRetry && !isAuthEndpoint && token) {
        const refreshed = await tryRefreshAccessToken();
        if (refreshed) {
          return apiRequest(path, options, true);
        }
      }

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.response = { status: response.status, data };
        throw error;
      }

      if (isGet) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export const apiClient = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' }),
  invalidateCache: invalidateApiCache
};

export default apiClient;
