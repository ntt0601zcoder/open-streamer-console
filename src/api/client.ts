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

const afterResponse: NonNullable<Options['hooks']>['afterResponse'] = [
  async (_req, _opts, res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new APIError(res.status, body);
    }
  },
];

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const api = ky.create({
  prefixUrl: BASE_URL,
  hooks: { afterResponse },
  timeout: 15_000,
});
