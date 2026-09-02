# Security policy

Please do not disclose a suspected vulnerability in a public issue. Email the maintainers privately with a clear description, affected version, reproduction steps, and impact. Allow reasonable time for a fix before public disclosure.

Vaultify is self-hosted software. Operators are responsible for HTTPS termination, host hardening, backups, file-system permissions, dependency updates, and protecting `VAULTIFY_MASTER_KEY`. Losing the master key makes encrypted files unrecoverable.

Vaultify never exposes encryption keys, password hashes, sessions, environment values, or plaintext files through the admin UI or audit log.

The application uses a process-local rate limiter by default. Operators running multiple instances should place a shared reverse-proxy or distributed rate limiter in front of Vaultify.

