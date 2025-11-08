// client/src/services/api.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_BASE ?? 'http://localhost:3001').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 35_000;
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 2;

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
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Public helper so components can ignore canceled errors if they want */
export const isCanceledError = (err: unknown): boolean => {
  const ax = err as AxiosError & { code?: string; __CANCEL__?: boolean };
  return !!(axios.isCancel?.(ax) || ax?.code === 'ERR_CANCELED' || (ax as any)?.message === 'canceled' || ax?.__CANCEL__);
};

export const toReadableError = (err: unknown): string => {
  const ax = err as AxiosError<any>;
  const data = ax?.response?.data;
  const status = ax?.response?.status;

  return (
    (isCanceledError(err) ? 'Request canceled' : null) ||
    data?.error ||
    data?.message ||
    (typeof data === 'string' ? data : null) ||
    ax?.message ||
    (status ? `Request failed with status ${status}` : 'Network error')
  );
};

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
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

  (config as any).__retryCount ??= 0;
  return config;
});

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    // 👉 Treat cancellations as benign: resolve with a never-settling promise
    // so the awaiting call doesn’t throw and React’s overlay stays quiet.
    if (isCanceledError(error)) {
      return new Promise<never>(() => {});
    }

    const config = error.config as (InternalAxiosRequestConfig & { __retryCount?: number }) | undefined;
    const status = error.response?.status;

    if (isBrowser && 'onLine' in navigator && !navigator.onLine) {
      return Promise.reject(error);
    }

    if (config && status && RETRY_STATUS.has(status) && (config.__retryCount ?? 0) < MAX_RETRIES) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      const base = 300 * Math.pow(2, config.__retryCount - 1);
      const jitter = Math.floor(Math.random() * 120);
      await sleep(base + jitter);
      return api.request(config);
    }

    (error as any).normalizedMessage = toReadableError(error);
    return Promise.reject(error);
  }
);

/** Ergonomic helpers that normalize errors (and also ignore cancellations) */
export async function http<T>(p: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const res = await p;
    return res.data;
  } catch (err) {
    if (isCanceledError(err)) {
      // Return a never-resolving promise so upstream awaits don’t throw.
      return new Promise<T>(() => {});
    }
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

export default api;
