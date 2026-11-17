# Security

SecureNotes is a portfolio project built to practice secure web-app
fundamentals. This document maps each **OWASP Top 10 (2021)** category to what is
actually implemented and **where in the code** — and is honest about what is
*not* done. Nothing below is claimed unless it exists in the repository.

> It is a demonstration app, not a hardened production service. See
> [What is intentionally out of scope](#what-is-intentionally-out-of-scope).

## OWASP Top 10 (2021) checklist

### A01:2021 — Broken Access Control  ✅
- **Per-user data isolation:** every notes query is scoped by `user_id`, so one
  user can never read or modify another's notes. A note owned by someone else
  returns `404` (indistinguishable from missing — no information leak).
  → [`backend/src/db.js`](backend/src/db.js) (`listNotes`, `getNote`,
  `updateNote`, `deleteNote` all bind `user_id`), [`backend/src/routes/notes.js`](backend/src/routes/notes.js)
- **Authentication required** on every notes route via middleware.
  → `authRequired` in [`backend/src/auth.js`](backend/src/auth.js)
- **Tested:** "user B cannot read/update/delete user A's note"
  → [`backend/test/notes.test.js`](backend/test/notes.test.js)

### A02:2021 — Cryptographic Failures  ✅
- **Passwords** hashed with **argon2id** (memory-hard), never stored or logged in
  plaintext. → `hashPassword` / `verifyPassword` in [`backend/src/auth.js`](backend/src/auth.js)
- **Session tokens** are signed JWTs (HS256) delivered in cookies that are
  `httpOnly` + `SameSite=Strict` + `Secure` (in production).
  → [`backend/src/config.js`](backend/src/config.js), `setAuthCookie`
- **No secrets in the repo:** `JWT_SECRET` comes from the environment and the app
  **refuses to boot in production without a strong one**; only `.env.example`
  (empty) is committed. → `resolveJwtSecret` in [`backend/src/config.js`](backend/src/config.js)

### A03:2021 — Injection  ✅
- **SQL:** 100% parameterized prepared statements — no user input is ever
  concatenated into SQL. → [`backend/src/db.js`](backend/src/db.js)
- **Input validation:** every request body is validated/coerced with **zod**
  before use. → [`backend/src/validation.js`](backend/src/validation.js)
- **XSS:** React escapes all rendered values by default; no `dangerouslySetInnerHTML`
  is used. The API only emits JSON.

### A04:2021 — Insecure Design  ✅
- **Defense in depth** against CSRF: `SameSite=Strict` cookies **and** a
  double-submit CSRF token required on all state-changing requests.
  → [`backend/src/csrf.js`](backend/src/csrf.js)
- **Fail closed:** production boot aborts without a strong JWT secret.
- **Least privilege:** the backend container runs as a non-root user.
  → [`backend/Dockerfile`](backend/Dockerfile)

### A05:2021 — Security Misconfiguration  ✅
- **Secure headers** via `helmet`; `X-Powered-By` disabled; JSON body size capped
  at 32 KB (DoS mitigation); `trust proxy` enabled only in production.
  → [`backend/src/app.js`](backend/src/app.js)
- **Edge hardening:** the SecureCore gateway injects HSTS/CSP/`X-Frame-Options`/
  etc. on every response in the docker-compose deployment.
  → [`deploy/securecore.config.yaml`](deploy/securecore.config.yaml)
- Errors return a generic message; stack traces are never sent to clients.
  → error handler in [`backend/src/app.js`](backend/src/app.js)

### A06:2021 — Vulnerable and Outdated Components  ⚠️ partial
- Dependencies are pinned and installed from a committed lockfile (`npm ci`), and
  **`npm audit --omit=dev --audit-level=high` runs as a CI gate** on the
  production dependencies that actually ship (0 known advisories).
  → [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- **Not done:** automated dependency-update bots (e.g. Dependabot) are not
  configured, and dev-tooling advisories are not gated.

### A07:2021 — Identification and Authentication Failures  ✅
- **Brute-force protection:** login and registration are rate-limited per IP.
  → `rateLimit` in [`backend/src/app.js`](backend/src/app.js)
- **No user enumeration:** login returns the same generic error for a wrong
  password and an unknown user. → [`backend/src/routes/auth.js`](backend/src/routes/auth.js)
- Short-lived sessions (2h JWT); logout clears the auth cookie server-side.
- Minimum password length enforced (8+). → [`backend/src/validation.js`](backend/src/validation.js)

### A08:2021 — Software and Data Integrity Failures  ✅ partial
- JWT **signatures are verified** on every request; a tampered or expired token
  is rejected. → `authRequired` in [`backend/src/auth.js`](backend/src/auth.js)
- Reproducible installs via committed `package-lock.json` + `npm ci`.
- **Not done:** no artifact signing / SLSA provenance (out of scope for a demo).

### A09:2021 — Security Logging and Monitoring Failures  ⚠️ partial
- The SecureCore gateway emits **structured, tamper-evident JSON access logs**
  with sensitive-header redaction at the edge.
  → [`deploy/securecore.config.yaml`](deploy/securecore.config.yaml) (`redact_headers`)
- The backend logs unhandled errors server-side without leaking details to clients.
- **Not done:** there is no centralized audit trail of auth events or alerting;
  a production system would add both.

### A10:2021 — Server-Side Request Forgery (SSRF)  ✅ (not applicable)
- The application never fetches user-supplied URLs or makes outbound requests on
  behalf of a request, so the SSRF surface is effectively nil. Ingress is funneled
  through the SecureCore gateway in the compose deployment.

## What is intentionally out of scope

This is a learning/demo project. A production deployment would additionally want:
email verification and password reset, account lockout with backoff, refresh
tokens / token revocation lists, 2FA, centralized audit logging and alerting,
automated dependency updates, and a managed secrets store. These are **not**
implemented here and are not claimed to be.

## Reporting

Found an issue? Open a GitHub issue on this repository. As a personal portfolio
project it has no formal SLA.
