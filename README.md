# Vaultify

Secure, open-source, self-hosted file storage for everyday use. Vaultify stores every uploaded file encrypted with AES-256-GCM, keeps file metadata in SQLite, and gives administrators a separate control panel without exposing secrets.

## Features

- First-run setup wizard with protected Primary Administrator account
- Registration, login, logout, secure HTTP-only sessions, password changes, and admin password resets
- AES-256-GCM encrypted files on disk with unique IVs and authenticated integrity tags
- Private files with server-side ownership checks and path traversal protection
- Drag-and-drop multi-file upload, progress, search, filtering, sorting, previews, rename, download, and delete
- Per-user byte quotas, over-quota handling, upload rules, and maximum upload size
- Admin user, storage, registration, security, settings, and audit log views
- CSRF protection, rate limiting, input validation, safe error responses, and audit logging

## Quick start

Requirements: Node.js 20+, npm, and a writable data directory.

```bash
npm install
cp .env.example .env
# Generate a 32-byte key: openssl rand -base64 32
# Put it in VAULTIFY_MASTER_KEY in .env
npm run db:migrate
npm run dev
```

Open `http://localhost:3000/setup` for the first-run wizard. Setup is permanently disabled after the first administrator is created.

## Production

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

Run behind HTTPS, set `NODE_ENV=production`, use a persistent `VAULTIFY_DATA_DIR`, and keep `.env` outside version control. For multi-instance deployments, place the database and encrypted storage on a shared, locking-capable volume or use a single application instance.

See [SECURITY.md](SECURITY.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [docs/deployment.md](docs/deployment.md) before exposing an instance to the internet.

Support LW Development · Goal 10K.

