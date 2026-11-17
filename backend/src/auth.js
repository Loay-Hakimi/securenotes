// Password hashing (argon2id) + JWT issuance/verification + auth middleware.
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config, TOKEN_COOKIE } from './config.js';

// argon2id is the recommended password hash (memory-hard, side-channel resistant).
const ARGON_OPTS = { type: argon2.argon2id };

export function hashPassword(plain) {
  return argon2.hash(plain, ARGON_OPTS);
}

export function verifyPassword(hash, plain) {
  return argon2.verify(hash, plain).catch(() => false);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.cookie.maxAgeMs,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
  });
}

/**
 * Express middleware: require a valid JWT in the httpOnly cookie.
 * Attaches req.user = { id, username } or responds 401.
 */
export function authRequired(req, res, next) {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'authentication required' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired session' });
  }
}
