import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { makeApp, registerUser } from './helpers.js';
import { CSRF_HEADER } from '../src/config.js';

describe('notes CRUD', () => {
  it('creates, lists, reads, updates and deletes a note', async () => {
    const app = makeApp();
    const { agent, csrf } = await registerUser(app, 'frank');

    const created = await agent.post('/api/notes').set(CSRF_HEADER, csrf).send({ title: 'First', content: 'hello' });
    expect(created.status).toBe(201);
    const id = created.body.note.id;

    const list = await agent.get('/api/notes');
    expect(list.body.notes).toHaveLength(1);

    const read = await agent.get(`/api/notes/${id}`);
    expect(read.body.note.title).toBe('First');

    const upd = await agent.put(`/api/notes/${id}`).set(CSRF_HEADER, csrf).send({ title: 'Edited', content: 'bye' });
    expect(upd.body.note.title).toBe('Edited');

    const del = await agent.delete(`/api/notes/${id}`).set(CSRF_HEADER, csrf);
    expect(del.status).toBe(200);
    const after = await agent.get('/api/notes');
    expect(after.body.notes).toHaveLength(0);
  });

  it('requires authentication for all notes routes', async () => {
    const app = makeApp();
    expect((await supertest(app).get('/api/notes')).status).toBe(401);
    expect((await supertest(app).post('/api/notes').send({ title: 'x' })).status).toBe(401);
  });

  it('rejects mutations without a valid CSRF token (403)', async () => {
    const app = makeApp();
    const { agent } = await registerUser(app, 'grace');
    const noHeader = await agent.post('/api/notes').send({ title: 'x', content: 'y' });
    expect(noHeader.status).toBe(403);
    const wrong = await agent.post('/api/notes').set(CSRF_HEADER, 'deadbeef').send({ title: 'x' });
    expect(wrong.status).toBe(403);
  });

  it('validates note input', async () => {
    const app = makeApp();
    const { agent, csrf } = await registerUser(app, 'heidi');
    const empty = await agent.post('/api/notes').set(CSRF_HEADER, csrf).send({ title: '', content: 'x' });
    expect(empty.status).toBe(400);
  });
});

describe('per-user data isolation (authorization)', () => {
  it('prevents user B from reading, updating or deleting user A\'s note', async () => {
    const app = makeApp();
    const alice = await registerUser(app, 'alice2');
    const bob = await registerUser(app, 'bob2');

    const created = await alice.agent
      .post('/api/notes')
      .set(CSRF_HEADER, alice.csrf)
      .send({ title: 'Alice secret', content: 'private' });
    const id = created.body.note.id;

    // B cannot see A's note in their own list.
    const bobList = await bob.agent.get('/api/notes');
    expect(bobList.body.notes).toHaveLength(0);

    // B cannot read A's note by id (looks like it doesn't exist).
    expect((await bob.agent.get(`/api/notes/${id}`)).status).toBe(404);

    // B cannot update A's note.
    const bobUpdate = await bob.agent
      .put(`/api/notes/${id}`)
      .set(CSRF_HEADER, bob.csrf)
      .send({ title: 'hacked', content: 'pwned' });
    expect(bobUpdate.status).toBe(404);

    // B cannot delete A's note.
    expect((await bob.agent.delete(`/api/notes/${id}`).set(CSRF_HEADER, bob.csrf)).status).toBe(404);

    // A's note is untouched.
    const aliceRead = await alice.agent.get(`/api/notes/${id}`);
    expect(aliceRead.body.note.title).toBe('Alice secret');
  });
});

describe('login rate limiting', () => {
  it('returns 429 after too many attempts', async () => {
    const app = makeApp({ rateLimit: { windowMs: 60_000, max: 3 } });
    await registerUser(app, 'ivan');
    let status;
    for (let i = 0; i < 6; i++) {
      status = (await supertest(app).post('/api/auth/login').send({ username: 'ivan', password: 'wrongpass1' })).status;
    }
    expect(status).toBe(429);
  });
});
