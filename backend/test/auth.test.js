import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { makeApp, registerUser, csrfFrom } from './helpers.js';
import { TOKEN_COOKIE } from '../src/config.js';

describe('authentication', () => {
  it('registers a user and sets an httpOnly auth cookie', async () => {
    const app = makeApp();
    const res = await supertest(app).post('/api/auth/register').send({ username: 'alice', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('alice');
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toContain(TOKEN_COOKIE);
    const tokenCookie = res.headers['set-cookie'].find((c) => c.startsWith(TOKEN_COOKIE));
    expect(tokenCookie.toLowerCase()).toContain('httponly');
    expect(tokenCookie.toLowerCase()).toContain('samesite=strict');
  });

  it('rejects duplicate usernames', async () => {
    const app = makeApp();
    await registerUser(app, 'bob');
    const res = await supertest(app).post('/api/auth/register').send({ username: 'bob', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects weak input (short password, bad username)', async () => {
    const app = makeApp();
    const r1 = await supertest(app).post('/api/auth/register').send({ username: 'ok', password: 'short' });
    expect(r1.status).toBe(400);
    const r2 = await supertest(app).post('/api/auth/register').send({ username: 'has space', password: 'password123' });
    expect(r2.status).toBe(400);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const app = makeApp();
    await registerUser(app, 'carol', 'password123');
    const ok = await supertest(app).post('/api/auth/login').send({ username: 'carol', password: 'password123' });
    expect(ok.status).toBe(200);
    const bad = await supertest(app).post('/api/auth/login').send({ username: 'carol', password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    // Unknown user returns the same generic 401 (no account enumeration).
    const unknown = await supertest(app).post('/api/auth/login').send({ username: 'ghost', password: 'password123' });
    expect(unknown.status).toBe(401);
    expect(bad.body.error).toBe(unknown.body.error);
  });

  it('requires auth for /me and clears the cookie on logout', async () => {
    const app = makeApp();
    const anon = await supertest(app).get('/api/auth/me');
    expect(anon.status).toBe(401);

    const { agent } = await registerUser(app, 'dave');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('dave');

    await agent.post('/api/auth/logout');
    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });

  it('issues a fresh CSRF token on register/login', async () => {
    const app = makeApp();
    const { res } = await registerUser(app, 'erin');
    expect(csrfFrom(res)).toBeTruthy();
  });
});
