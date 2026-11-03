interface Env { DB: D1Database; APP_ENV: string; }
interface AuthPrincipal { userId: string; villageIds: string[]; roles: string[]; platformAdmin: boolean; }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function authenticate(_request: Request, _env: Env): Promise<AuthPrincipal | null> {
  // SECURITY: Plug in a vetted JWT/JWKS verifier (e.g. Supabase Auth) here.
  // Never decode a JWT without verifying its signature, issuer, audience and expiry.
  return null;
}

function canAccessVillage(principal: AuthPrincipal, villageId: string): boolean {
  return principal.platformAdmin || principal.villageIds.includes(villageId);
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return json({ ok: true, service: "rgms-team-pro-api", environment: env.APP_ENV });
  }

  const principal = await authenticate(request, env);
  if (!principal) return json({ error: "unauthorized", message: "Configure the production JWT verifier before protected API use." }, 401);

  if (request.method === "GET" && url.pathname === "/v1/villages") {
    if (principal.platformAdmin) {
      const rows = await env.DB.prepare("SELECT id, village_code, name, status FROM villages ORDER BY name").all();
      return json({ villages: rows.results });
    }
    if (principal.villageIds.length === 0) return json({ villages: [] });
    const placeholders = principal.villageIds.map(() => "?").join(",");
    const rows = await env.DB.prepare(`SELECT id, village_code, name, status FROM villages WHERE id IN (${placeholders}) ORDER BY name`)
      .bind(...principal.villageIds).all();
    return json({ villages: rows.results });
  }

  if (request.method === "POST" && url.pathname === "/v1/players") {
    const body = await request.json() as { villageId?: string; fullName?: string; dateOfBirth?: string; identityHmac?: string };
    if (!body.villageId || !body.fullName) return json({ error: "villageId and fullName are required" }, 400);
    if (!canAccessVillage(principal, body.villageId)) return json({ error: "forbidden" }, 403);
    // ID allocation and insert must be made atomic in the production provisioning service.
    // This endpoint intentionally does not issue a Sports ID until that transaction exists.
    return json({ error: "not_implemented", message: "Player ID allocation/verification workflow is scheduled for Phase 2." }, 501);
  }

  if (request.method === "POST" && url.pathname === "/v1/matches/events") {
    const body = await request.json() as { eventId?: string; matchId?: string; villageId?: string; inningsNo?: number; sequenceNo?: number; payload?: unknown; deviceId?: string };
    if (!body.eventId || !body.matchId || !body.villageId || !body.inningsNo || !body.sequenceNo || body.payload === undefined) {
      return json({ error: "eventId, matchId, villageId, inningsNo, sequenceNo and payload are required" }, 400);
    }
    if (!canAccessVillage(principal, body.villageId)) return json({ error: "forbidden" }, 403);
    const match = await env.DB.prepare("SELECT id, village_id, status, version FROM matches WHERE id = ? AND village_id = ?")
      .bind(body.matchId, body.villageId).first<{id:string; village_id:string; status:string; version:number}>();
    if (!match) return json({ error: "match_not_found" }, 404);
    const existing = await env.DB.prepare("SELECT event_id FROM scoring_events WHERE event_id = ?").bind(body.eventId).first();
    if (existing) return json({ accepted: true, duplicate: true, eventId: body.eventId });
    const payloadJson = JSON.stringify(body.payload);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payloadJson));
    const payloadHash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    try {
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO scoring_events
          (event_id,village_id,match_id,innings_no,sequence_no,device_id,actor_user_id,payload_json,payload_hash)
          VALUES (?,?,?,?,?,?,?,?,?)`)
          .bind(body.eventId, body.villageId, body.matchId, body.inningsNo, body.sequenceNo, body.deviceId ?? null, principal.userId, payloadJson, payloadHash),
        env.DB.prepare("UPDATE matches SET version = version + 1 WHERE id = ? AND village_id = ?")
          .bind(body.matchId, body.villageId),
        env.DB.prepare(`INSERT INTO offline_sync_receipts(event_id,match_id,device_id,server_sequence)
          VALUES (?,?,?,?)`).bind(body.eventId, body.matchId, body.deviceId ?? "unknown", body.sequenceNo)
      ]);
    } catch {
      // Unique event ID / sequence constraints make retries idempotent; clients should
      // fetch current match state to resolve a sequence collision.
      const duplicate = await env.DB.prepare("SELECT event_id FROM scoring_events WHERE event_id = ?").bind(body.eventId).first();
      if (duplicate) return json({ accepted: true, duplicate: true, eventId: body.eventId });
      return json({ error: "event_conflict", message: "Sequence collision or invalid event; refresh match state." }, 409);
    }
    return json({ accepted: true, duplicate: false, eventId: body.eventId }, 201);
  }

  return json({ error: "not_found" }, 404);
}

export default { fetch: handle };
