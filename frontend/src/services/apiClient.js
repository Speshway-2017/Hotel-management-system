/**
 * High-Performance Centralized API Client
 * - Automatic Authorization Header injection
 * - In-flight Request Deduplication (prevents duplicate simultaneous HTTP calls)
 * - Micro-caching (5s TTL) for idempotent GET requests
 * - Automatic Cache Invalidation on Mutations (POST, PUT, DELETE, PATCH)
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

// Memory cache for GET responses: key -> { data, timestamp }
const cache = new Map();
const CACHE_TTL_MS = 5000; // 5 seconds micro-cache

// In-flight pending requests: key -> Promise
const inFlightRequests = new Map();

/**
 * Clear the entire API cache or keys matching a prefix
 */
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

/**
 * Primary request function with deduplication and caching
 */
export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;
  const isGet = method === 'GET';
  const bypassCache = options.bypassCache === true;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const cacheKey = `${method}:${url}:${token || ''}`;

  // If mutation, invalidate matching cache entries
  if (!isGet) {
    invalidateApiCache();
  }

  // 1. Check in-memory cache for GET requests
  if (isGet && !bypassCache) {
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  // 2. In-flight request deduplication for concurrent identical GETs
  if (isGet && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Execute HTTP request
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        method,
        headers
      });

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

      // Store in micro-cache
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
