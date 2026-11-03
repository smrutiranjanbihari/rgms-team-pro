# Phase 2 — Secure API and village operations

## Included
- Supabase Auth JWT verification using JWKS, issuer and audience checks.
- `GET /v1/me`, scoped village listing, platform-admin village provisioning.
- Village-scoped team and tournament creation and dashboard counts.
- Append-only audit triggers and query indexes.

## 1. Configure D1
Create a Cloudflare D1 database named `rgms-team-pro`, then replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `apps/api/wrangler.toml` with its database ID.

From the repository root on Termux:
```bash
cd ~/rgms-upload
pkg install nodejs-lts -y
npm install -g pnpm
cd apps/api
pnpm install
npx wrangler d1 migrations apply rgms-team-pro --remote
```
For local development, omit `--remote`.

## 2. Configure Supabase Auth
Create a Supabase project and enable your chosen sign-in method. From `apps/api`:
```bash
npx wrangler secret put SUPABASE_URL
```
Enter your project URL, e.g. `https://YOUR_PROJECT_REF.supabase.co`. Do not use a service-role key in the app.

## 3. Bootstrap first platform administrator
Sign in once through Supabase Auth. Obtain that account's UUID (`sub`) from the trusted Supabase dashboard. Then run:
```bash
npx wrangler d1 execute rgms-team-pro --remote --command "INSERT OR IGNORE INTO platform_admins(auth_subject) VALUES ('YOUR_AUTH_USER_UUID');"
```
Replace the placeholder with the actual UUID. Use `--local` for local D1.

## 4. Deploy
```bash
npx wrangler deploy
```

## API
Protected endpoints require `Authorization: Bearer SUPABASE_ACCESS_TOKEN`.
- `GET /v1/me`
- `GET /v1/villages`
- `POST /v1/villages` with `{"parentNodeId":"GRAM_PANCHAYAT_NODE_ID","name":"Village Name"}` (platform admin only)
- `POST /v1/villages/VILLAGE_ID/teams` with `{"name":"Village XI"}`
- `POST /v1/villages/VILLAGE_ID/tournaments` with `{"name":"Monsoon Cup","format":"LEAGUE"}`
- `GET /v1/villages/VILLAGE_ID/dashboard`

## Security notes
JWT signatures, issuer and audience are verified. Village access comes from database roles, never from a client-supplied village ID alone. Village code sequence gaps can occur if a later insert fails; codes are not reused. Audit UPDATE/DELETE are blocked by triggers, but a database owner can alter schema. For true WORM retention, export to separately administered immutable storage. Do not collect Aadhaar or identity scans without legal review, consent and retention controls.
