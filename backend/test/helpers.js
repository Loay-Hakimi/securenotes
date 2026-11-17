import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { CSRF_COOKIE } from '../src/config.js';
import supertest from 'supertest';

/** Build an app on a fresh in-memory DB. Rate limiting off unless overridden. */
export function makeApp(opts = { rateLimit: false }) {
  const db = openDb(':memory:');
  return createApp(db, opts);
}

/** Pull the CSRF token value out of a Set-Cookie response header. */
export function csrfFrom(res) {
  const cookies = res.headers['set-cookie'] || [];
  const found = cookies.find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return found ? decodeURIComponent(found.split('=')[1].split(';')[0]) : null;
}

/** Register a user and return an authenticated supertest agent + csrf token. */
export async function registerUser(app, username, password = 'password123') {
  const agent = supertest.agent(app);
  const res = await agent.post('/api/auth/register').send({ username, password });
  return { agent, csrf: csrfFrom(res), res };
}
