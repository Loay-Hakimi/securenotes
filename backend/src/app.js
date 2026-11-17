// Express app assembly. createApp(db, opts) builds the app around an injected
// database handle so tests can run against an in-memory SQLite instance.
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { notesRouter } from './routes/notes.js';

const DEFAULT_AUTH_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 };

export function createApp(db, opts = {}) {
  const app = express();

  // Behind securecore/a reverse proxy in production, trust exactly one hop so
  // req.ip reflects the real client for rate limiting. Never trust by default.
  app.set('trust proxy', config.isProd ? 1 : false);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '32kb' })); // cap body size (DoS mitigation)
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Rate-limit authentication attempts (brute-force / credential-stuffing).
  const rl = opts.rateLimit ?? DEFAULT_AUTH_RATE_LIMIT;
  const auth = authRouter(db);
  if (rl) {
    const limiter = rateLimit({
      ...rl,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'too many attempts, please try again later' },
    });
    app.use('/api/auth/login', limiter);
    app.use('/api/auth/register', limiter);
  }
  app.use('/api/auth', auth);
  app.use('/api/notes', notesRouter(db));

  // 404 for unknown API routes.
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

  // Centralized error handler — never leaks internals to the client.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[securenotes] unhandled error:', err?.message);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}
