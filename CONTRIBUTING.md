# Contributing to Vaultify

Thanks for helping improve Vaultify. Please open an issue before large changes, keep pull requests focused, and include tests for security-sensitive behavior.

## Development

1. Install Node.js 20+ and dependencies with `npm install`.
2. Copy `.env.example` to `.env`, provide a local encryption key, and run `npm run db:migrate`.
3. Run `npm run dev`.
4. Before submitting, run `npm run typecheck`, `npm run lint`, and `npm run build`.

Never commit `.env`, database files, uploaded files, session material, or real encryption keys. Do not add logging that could reveal passwords, tokens, keys, file contents, or internal paths.

