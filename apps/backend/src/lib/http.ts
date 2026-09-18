import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiError } from '@sahayo/shared';
import type { ZodType } from 'zod';

/**
 * An error a route can throw and the client can act on: a status, a stable code, and
 * a message saying what went wrong and what to do next.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: ApiError['issues'],
  ) {
    super(message);
  }
}

export const notFound = (what: string, id: string): HttpError =>
  new HttpError(404, 'NOT_FOUND', `No ${what} with id ${id}. Check the id, or list them first.`);

/**
 * Parses `req.body` (or the query string) with a shared zod schema and hands the
 * route the typed result. Nothing in a route validates by hand.
 */
export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new HttpError(
    400,
    'INVALID_REQUEST',
    'The request is missing fields or has fields of the wrong shape. See `issues` for each one.',
    result.error.issues.map((issue) => ({ path: issue.path.join('.') || '(body)', message: issue.message })),
  );
}

/** Wraps an async route so a thrown error reaches the error handler instead of hanging the request. */
export function route(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}

/** Turns any thrown error into an `ApiError` body. Unknown errors are a 500 and are logged. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    const body: ApiError = { ok: false, error: error.code, message: error.message, ...(error.issues ? { issues: error.issues } : {}) };
    res.status(error.status).json(body);
    return;
  }
  if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ ok: false, error: 'INVALID_JSON', message: 'The body is not valid JSON.' } satisfies ApiError);
    return;
  }
  console.error('[backend] unhandled error', error);
  res.status(500).json({ ok: false, error: 'INTERNAL', message: 'Something went wrong on the server. Try again.' } satisfies ApiError);
};
