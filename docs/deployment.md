# Deployment

Vaultify is a Node.js application. Build with `npm run build` and run the generated standalone server with `node .next/standalone/server.js`, or use `npm run start` in a normal install.

Set these runtime values:

- `VAULTIFY_MASTER_KEY`: base64-encoded 32-byte key. Store it in a secret manager. Losing it makes existing files unrecoverable.
- `VAULTIFY_DATA_DIR`: persistent directory containing `vaultify.db` and the encrypted `files/` directory.
- `NODE_ENV=production`: enables the `Secure` session and CSRF cookies.

Terminate TLS at a reverse proxy, restrict the data directory to the application user, back up the database and encrypted files together, and test restores. Do not run the app with a writable public directory mapped to the storage directory.

