import ky, { type Options } from 'ky';

export class APIError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    const msg =
      body !== null &&
      typeof body === 'object' &&
      'error' in body &&
      body.error !== null &&
      typeof body.error === 'object' &&
      'message' in body.error &&
      typeof body.error.message === 'string'
        ? body.error.message
        : `HTTP ${status}`;
    super(msg);
    this.name = 'APIError';
  }
}

// Management API credentials (HTTP Basic). Keyed by API base URL so multi-env
// console sessions don't collide.
const CREDS_KEY = `os.api.creds.${import.meta.env.VITE_API_BASE_URL ?? ''}`;

export interface APICredentials {
  username: string;
  password: string;
}

export function getApiCredentials(): APICredentials | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<APICredentials>;
    if (!parsed.username || !parsed.password) return null;
    return { username: parsed.username, password: parsed.password };
  } catch {
    return null;
  }
}

export function setApiCredentials(creds: APICredentials | null) {
  if (!creds) {
    localStorage.removeItem(CREDS_KEY);
    return;
  }
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

const beforeRequest: NonNullable<Options['hooks']>['beforeRequest'] = [
  (req) => {
    const creds = getApiCredentials();
    if (creds && !req.headers.has('Authorization')) {
      req.headers.set('Authorization', `Basic ${btoa(`${creds.username}:${creds.password}`)}`);
    }
  },
];

const afterResponse: NonNullable<Options['hooks']>['afterResponse'] = [
  async (_req, _opts, res) => {
    if (res.status === 401) {
      // Clear stale creds and bounce to /login. The page reload also wipes any
      // in-memory TanStack Query state, so the next session starts clean.
      setApiCredentials(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new APIError(res.status, body);
    }
  },
];

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const api = ky.create({
  prefixUrl: BASE_URL,
  hooks: { beforeRequest, afterResponse },
  timeout: 15_000,
});
