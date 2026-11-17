import { useEffect, useState } from 'react';
import { api } from './api.js';
import AuthForm from './AuthForm.jsx';
import NotesApp from './NotesApp.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await api.logout().catch(() => {});
    setUser(null);
  }

  if (loading) {
    return (
      <div className="center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="lock">🔒</span> SecureNotes
        </div>
        {user && (
          <div className="userbox">
            <span className="muted">@{user.username}</span>
            <button className="btn ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </header>

      <main className="main">
        {user ? <NotesApp /> : <AuthForm onAuthed={setUser} />}
      </main>

      <footer className="footer muted">
        Auth via httpOnly JWT cookies · CSRF-protected · per-user isolation
      </footer>
    </div>
  );
}
