# RGMS Team Pro

A monorepo starter for a village-level cricket management platform.

## Architecture
- `apps/web`: Next.js App Router web portal/admin starter.
- `apps/mobile`: Expo React Native Android starter.
- `apps/api`: Cloudflare Workers API.
- `packages/shared`: shared TypeScript domain types and scoring helpers.
- `database/migrations`: Cloudflare D1 SQLite schema.

## Phase 1 included
- Multi-village data model and server-side tenant scoping pattern.
- Hierarchical roles and permission checks.
- VIL-YYYY-XX village code format (sequence allocation must be done transactionally by the provisioning workflow).
- Player identity model with HMAC uniqueness digest and permanent 8-digit Sports ID allocation.
- Match, innings, delivery event ledger, idempotency keys, and append-only audit event tables.
- API starter endpoints for health, village list, player registration, and match event ingestion.
- Web and Android starter screens.

## Important production hardening before public launch
1. Configure real identity provider/JWT verification and role provisioning. The API starter deliberately rejects requests without a configured authentication verifier.
2. Apply D1 migrations to a non-production database first.
3. Implement transactional ID allocation using D1 batch/transaction-safe sequence updates and collision retries.
4. Keep HMAC secrets in Cloudflare Worker secrets; never put them in web/mobile bundles.
5. Restrict audit-table writes to the API service identity. Export audit events to independently controlled immutable storage for a true WORM guarantee.
6. Add automated tests, rate limits, abuse controls, backups, monitoring, and privacy/legal review.
7. Offline events must be created with stable UUID idempotency keys on device and replayed in order. The server must validate match state and reject duplicate event IDs.

## Local setup
Requirements: Node.js 20+, pnpm, Wrangler, Expo tooling.

```bash
pnpm install
pnpm --filter @rgms/api dev
pnpm --filter @rgms/web dev
pnpm --filter @rgms/mobile start
```

See `docs/IMPLEMENTATION_PLAN.md` and `docs/SECURITY_MODEL.md`.
