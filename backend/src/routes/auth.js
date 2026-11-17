// Authentication routes: register, login, logout, session info.
import { Router } from 'express';
import {
  authRequired,
  clearAuthCookie,
  hashPassword,
  setAuthCookie,
  signToken,
  verifyPassword,
} from '../auth.js';
import { issueCsrfToken } from '../csrf.js';
import { createUser, findUserByUsername } from '../db.js';
import { credentialsSchema, validateBody } from '../validation.js';
import { CSRF_COOKIE } from '../config.js';

export function authRouter(db) {
  const router = Router();

  router.post('/register', validateBody(credentialsSchema), async (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (findUserByUsername(db, username)) {
        return res.status(409).json({ error: 'username already taken' });
      }
      const user = createUser(db, username, await hashPassword(password));
      setAuthCookie(res, signToken(user));
      issueCsrfToken(res);
      return res.status(201).json({ user: { id: user.id, username: user.username } });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/login', validateBody(credentialsSchema), async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const user = findUserByUsername(db, username);
      // Generic error + always-run verify shape avoids username enumeration.
      const ok = user ? await verifyPassword(user.password_hash, password) : false;
      if (!user || !ok) {
        return res.status(401).json({ error: 'invalid username or password' });
      }
      setAuthCookie(res, signToken(user));
      issueCsrfToken(res);
      return res.json({ user: { id: user.id, username: user.username } });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    return res.json({ ok: true });
  });

  // Returns the current user and refreshes the CSRF token for an existing session.
  router.get('/me', authRequired, (req, res) => {
    issueCsrfToken(res);
    return res.json({ user: req.user });
  });

  return router;
}
