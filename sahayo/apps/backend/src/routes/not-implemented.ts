import type { RequestHandler } from 'express';

/**
 * Phase 1 stub. Every domain route answers 501 until its phase lands, so the
 * surface is discoverable without pretending to work.
 */
export function notImplemented(resource: string): RequestHandler {
  return (req, res) => {
    res.status(501).json({
      ok: false,
      error: 'NOT_IMPLEMENTED',
      resource,
      method: req.method,
      path: req.originalUrl,
    });
  };
}
