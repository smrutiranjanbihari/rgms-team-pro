# Security model

- Tenant boundary: authenticated principal has an explicit `village_id` scope unless a platform-level role grants broader access.
- Never trust a `village_id` supplied by a client; derive allowed scope from the verified principal and check every target record.
- Roles are hierarchical but permissions are explicit. A role name alone must not bypass tenant checks.
- Player identity: use a keyed HMAC digest for duplicate detection. Keep the HMAC key in Worker secrets. Do not store Aadhaar numbers or identity document images unless there is a reviewed legal basis and a documented retention policy.
- Sports IDs are public identifiers, not authentication credentials.
- Scoring: immutable event ledger; corrections are compensating events with reason and actor.
- Audit: D1 append-only is not, by itself, WORM. A database administrator could alter it. Export to separately administered immutable object storage with retention lock for stronger guarantees.
- Secrets: never commit `.env`, `.dev.vars`, service keys, signing keys, or production credentials.
- Authentication: this starter has an auth adapter boundary and denies access until a real JWT verifier is configured.
