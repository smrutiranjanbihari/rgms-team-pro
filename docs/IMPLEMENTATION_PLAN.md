# Implementation plan

## Phase 1 — Foundation (this starter)
- Monorepo, shared types, D1 schema, API/web/mobile shells.
- Village-scoped records and role model.
- Player identity and scoring event foundations.

## Phase 2 — Provisioning and identity
- Platform super-admin creates regions/districts/blocks/gram panchayats/villages.
- Allocate village codes `VIL-YYYY-XX` with a sequence row locked/updated transactionally.
- Issue permanent Sports IDs in the `1000XXXX` range.
- Verify player identity through approved evidence and human review.
- Store only HMAC-SHA256 uniqueness digests for sensitive identity values; never use plain hashes for low-entropy identifiers.
- Build consent, correction, suspension, and appeal workflows.

## Phase 3 — Tournament operations
- Teams, squad registration, player eligibility, tournament rules, groups, fixtures, points tables.
- Every tenant-owned row carries `village_id`; enforce scope in API queries and authorization.
- Cross-village tournaments require explicit platform-level federation and opt-in.

## Phase 4 — Scoring engine
- Ball-by-ball event ledger; derive scorecard and statistics from events.
- Handle legal/illegal deliveries, wides, no-balls, byes, leg-byes, penalties, wickets, run-outs, retired hurt, strike rotation, over changes, innings transitions.
- Store scorer corrections as compensating events; never silently overwrite historical deliveries.
- Add independent scoring-rule tests before enabling live use.

## Phase 5 — Offline-first Android
- Local SQLite queue with UUID event IDs, match ID, device ID, sequence number, payload and creation time.
- Retry with exponential backoff; server idempotency prevents duplicate scoring.
- Conflict workflow for stale match versions and simultaneous scorers.
- Clear sync state and last acknowledged sequence to the scorer.

## Phase 6 — Public portal and analytics
- Public live score, fixtures, results, points tables, player profiles and career statistics.
- Cache public reads; do not expose private identity documents or contact data.
- Aggregate statistics from validated scoring events.

## Phase 7 — Audit, security and release
- Append-only audit events with actor, tenant, action, target, timestamp, request ID and before/after digest.
- External immutable retention for WORM requirements.
- Threat model, penetration testing, privacy review, backups, restore drills and operational monitoring.
