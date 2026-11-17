import { useEffect, useState } from 'react';
import { api } from './api.js';

export default function NotesApp() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await api.listNotes();
      setNotes(data.notes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setTitle('');
    setContent('');
    setEditingId(null);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateNote(editingId, title, content);
      } else {
        await api.createNote(title, content);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  async function remove(id) {
    setError('');
    try {
      await api.deleteNote(id);
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="notes-layout">
      <section className="card">
        <h2>{editingId ? 'Edit note' : 'New note'}</h2>
        <form onSubmit={submit}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </label>
          <label>
            Content
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} maxLength={10000} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn primary" type="submit">
              {editingId ? 'Save changes' : 'Add note'}
            </button>
            {editingId && (
              <button className="btn ghost" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="notes-list">
        <h2>Your notes {notes.length > 0 && <span className="count">{notes.length}</span>}</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="muted empty">No notes yet. Add your first one.</p>
        ) : (
          notes.map((note) => (
            <article className="card note" key={note.id}>
              <div className="note-head">
                <h3>{note.title}</h3>
                <div className="note-actions">
                  <button className="link" onClick={() => startEdit(note)}>
                    Edit
                  </button>
                  <button className="link danger" onClick={() => remove(note.id)}>
                    Delete
                  </button>
                </div>
              </div>
              {note.content && <p className="note-body">{note.content}</p>}
              <p className="muted stamp">Updated {note.updated_at}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
