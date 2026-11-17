// CSRF protection via the double-submit-cookie pattern (defense-in-depth on top
// of SameSite=Strict auth cookies). A non-httpOnly CSRF token cookie is set; the
// client must echo it in the X-CSRF-Token header on state-changing requests. An
// attacker's cross-site request cannot read the cookie to forge the header.
import crypto from 'node:crypto';
import { CSRF_COOKIE, CSRF_HEADER, config } from './config.js';

export function issueCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // the frontend JS must read it to echo in the header
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.cookie.maxAgeMs,
  });
  return token;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Reject state-changing requests whose X-CSRF-Token header does not match the
 * CSRF cookie. Uses a constant-time comparison.
 */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return res.status(403).json({ error: 'invalid CSRF token' });
  }
  next();
}
