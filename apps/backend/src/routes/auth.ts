import { Router } from 'express';
import { loginRequestSchema, type LoginResult } from '@sahayo/shared';
import { HttpError, parse, route } from '../lib/http';
import * as users from '../repositories/users';

/**
 * POST /auth/login — who a phone number belongs to.
 *
 * Demo sign-in: the number is looked up and the person returned. There is no OTP and no
 * token; the apps verify their demo OTP themselves, and the socket handshake trusts the
 * id it is given. Real authentication is its own phase.
 */
export function authRouter(): Router {
  const router = Router();

  router.post(
    '/login',
    route((req, res) => {
      const { phone } = parse(loginRequestSchema, req.body);
      const user = users.findByPhone(phone);
      if (!user) {
        throw new HttpError(404, 'UNKNOWN_PHONE', 'No account uses this number. Check it, or sign up with it first.');
      }
      const workerId = users.workerIdForUser(user.id);
      const result: LoginResult = { user, role: user.role, ...(workerId ? { workerId } : {}) };
      res.json(result);
    }),
  );

  return router;
}
