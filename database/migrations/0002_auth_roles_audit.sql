-- Phase 2 identity, roles, indexes and append-only audit protections.
CREATE TABLE IF NOT EXISTS platform_admins (
  auth_subject TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_village_roles_village_status ON user_village_roles(village_id,status,role);
CREATE INDEX IF NOT EXISTS idx_players_village_status ON players(village_id,verification_status);
CREATE INDEX IF NOT EXISTS idx_teams_village ON teams(village_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_village_status ON tournaments(village_id,status);
CREATE INDEX IF NOT EXISTS idx_matches_village_status ON matches(village_id,status);
CREATE TRIGGER IF NOT EXISTS audit_events_no_update BEFORE UPDATE ON audit_events
BEGIN SELECT RAISE(ABORT,'audit_events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_events_no_delete BEFORE DELETE ON audit_events
BEGIN SELECT RAISE(ABORT,'audit_events are append-only'); END;
