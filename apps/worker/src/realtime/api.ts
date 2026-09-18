import type { ApiError } from '@sahayo/shared';

import { API_PREFIX, API_URL, REQUEST_TIMEOUT_MS } from './config';

/** A failed request. `status` 0 means the server was never reached. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** One JSON request to the backend, abandoned after REQUEST_TIMEOUT_MS. */
export async function api<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok) {
      const error = json as Partial<ApiError> | undefined;
      throw new ApiRequestError(response.status, error?.error ?? 'HTTP_ERROR', error?.message ?? `The server answered ${response.status}.`);
    }
    return json as T;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(0, 'UNREACHABLE', 'The server could not be reached.');
  } finally {
    clearTimeout(timer);
  }
}
