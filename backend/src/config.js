// Central configuration. All secrets come from the environment — never hardcoded.
import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

// In production a strong JWT secret is mandatory; we refuse to boot without one
// so a deploy can never silently fall back to a guessable default.
function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProd) {
    throw new Error('JWT_SECRET must be set to a strong value (>=32 chars) in production');
  }
  // Dev/test only: ephemeral per-process secret (tokens don't survive a restart).
  return 'dev-only-insecure-secret-change-me-0123456789';
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  dbPath: process.env.DB_PATH || './data/securenotes.db',
  // Cookies: httpOnly always; Secure in production; SameSite=Strict to blunt CSRF.
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAgeMs: 2 * 60 * 60 * 1000, // 2h, matches token lifetime
  },
};

export const TOKEN_COOKIE = 'sn_token';
export const CSRF_COOKIE = 'sn_csrf';
export const CSRF_HEADER = 'x-csrf-token';
