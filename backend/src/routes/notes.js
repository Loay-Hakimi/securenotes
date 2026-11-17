// Notes CRUD. Every query is scoped to req.user.id, so one user can never read
// or modify another user's notes (per-user data isolation). A note belonging to
// someone else is indistinguishable from a missing note (404) — no info leak.
import { Router } from 'express';
import { authRequired } from '../auth.js';
import { csrfProtection } from '../csrf.js';
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  updateNote,
} from '../db.js';
import { noteSchema, validateBody } from '../validation.js';

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'invalid note id' });
    return null;
  }
  return id;
}

export function notesRouter(db) {
  const router = Router();

  // All notes routes require authentication; mutations also require a CSRF token.
  router.use(authRequired);

  router.get('/', (req, res) => {
    res.json({ notes: listNotes(db, req.user.id) });
  });

  router.get('/:id', (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const note = getNote(db, req.user.id, id);
    if (!note) return res.status(404).json({ error: 'note not found' });
    res.json({ note });
  });

  router.post('/', csrfProtection, validateBody(noteSchema), (req, res) => {
    const { title, content } = req.body;
    const note = createNote(db, req.user.id, title, content);
    res.status(201).json({ note });
  });

  router.put('/:id', csrfProtection, validateBody(noteSchema), (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const { title, content } = req.body;
    const note = updateNote(db, req.user.id, id, title, content);
    if (!note) return res.status(404).json({ error: 'note not found' });
    res.json({ note });
  });

  router.delete('/:id', csrfProtection, (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (!deleteNote(db, req.user.id, id)) {
      return res.status(404).json({ error: 'note not found' });
    }
    res.json({ ok: true });
  });

  return router;
}
