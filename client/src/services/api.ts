// client/src/services/api.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';

/** ===== Config ===== */
const API_BASE_URL = (process.env.REACT_APP_API_BASE ?? 'http://localhost:3001').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 35_000;
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 2; // total attempts = MAX_RETRIES + 1

/** ===== Utilities ===== */
const isBrowser = typeof window !== 'undefined';

const getToken = (): string | null => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

const randomId = (): string => {
  if (isBrowser && window.crypto?.getRandomValues) {
    const buf = new Uint8Array(16);
    window.crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node/legacy fallback
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalize any Axios error into a concise, readable message */
export const toReadableError = (err: unknown): string => {
  const ax = err as AxiosError<any>;
  const data = ax?.response?.data;
  const status = ax?.response?.status;

  return (
    data?.error ||
    data?.message ||
    (typeof data === 'string' ? data : null) ||
    ax?.message ||
    (status ? `Request failed with status ${status}` : 'Network error')
  );
};

/** ===== Axios Instance ===== */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true, // enable if using cookies across origins
});

/** ===== Request Interceptor =====
 * - Injects Bearer token (if present)
 * - Adds idempotency key for non-GET requests
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // Auth token
  const token = getToken();
  if (token) {
    const headers = config.headers ?? new AxiosHeaders();
    if (headers instanceof AxiosHeaders) {
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    } else {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
  }

  // Idempotency / request correlation for non-GET
  if (config.method && config.method.toUpperCase() !== 'GET') {
    const headers = config.headers ?? new AxiosHeaders();
    const key = randomId();
    if (headers instanceof AxiosHeaders) {
      headers.set('X-Request-Id', key);
    } else {
      (headers as Record<string, string>)['X-Request-Id'] = key;
    }
    config.headers = headers;
  }

  // Track retries
  (config as any).__retryCount ??= 0;

  return config;
});

/** ===== Response Interceptor with Exponential Backoff =====
 * Retries 429/502/503/504 with jittered backoff.
 */
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { __retryCount?: number }) | undefined;
    const status = error.response?.status;

    // Short-circuit for offline browsers
    if (isBrowser && 'onLine' in navigator && !navigator.onLine) {
      return Promise.reject(error);
    }

    // Retry iff: we have a config, status is retryable, and we haven't exceeded retries
    if (config && status && RETRY_STATUS.has(status) && (config.__retryCount ?? 0) < MAX_RETRIES) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      const base = 300 * Math.pow(2, config.__retryCount - 1); // 300ms, 600ms, ...
      const jitter = Math.floor(Math.random() * 120); // up to +120ms
      await sleep(base + jitter);
      return api.request(config);
    }

    // Attach a normalized message for consumers who want a single string
    (error as any).normalizedMessage = toReadableError(error);
    return Promise.reject(error);
  }
);

/** ===== Strongly-Typed Helpers (optional, ergonomic) ===== */
export async function http<T>(p: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const res = await p;
    return res.data;
  } catch (err) {
    // Always throw a readable Error with message
    const msg = toReadableError(err);
    throw new Error(msg);
  }
}

export const get = <T>(url: string, params?: Record<string, any>) =>
  http<T>(api.get<T>(url, { params }));

export const post = <T>(url: string, body?: any) =>
  http<T>(api.post<T>(url, body));

export const put = <T>(url: string, body?: any) =>
  http<T>(api.put<T>(url, body));

export const patch = <T>(url: string, body?: any) =>
  http<T>(api.patch<T>(url, body));

export const del = <T>(url: string) =>
  http<T>(api.delete<T>(url));

/** Export the raw instance when you need full control */
export default api;
