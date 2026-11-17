// Tiny API client. Sends the httpOnly auth cookie automatically (same-origin)
// and echoes the CSRF cookie in the X-CSRF-Token header on state-changing calls.

const CSRF_COOKIE = 'sn_csrf';

function readCsrfToken() {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = readCsrfToken();

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.details?.[0]?.message || data.error || `request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: (username, password) => request('POST', '/auth/register', { username, password }),
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),
  listNotes: () => request('GET', '/notes'),
  createNote: (title, content) => request('POST', '/notes', { title, content }),
  updateNote: (id, title, content) => request('PUT', `/notes/${id}`, { title, content }),
  deleteNote: (id) => request('DELETE', `/notes/${id}`),
};
