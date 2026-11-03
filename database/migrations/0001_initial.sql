PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS hierarchy_nodes (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES hierarchy_nodes(id),
  node_type TEXT NOT NULL CHECK(node_type IN ('STATE','DISTRICT','BLOCK','GRAM_PANCHAYAT','VILLAGE')),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS villages (
  id TEXT PRIMARY KEY,
  hierarchy_node_id TEXT NOT NULL UNIQUE REFERENCES hierarchy_nodes(id),
  village_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','SUSPENDED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS village_sequences (
  year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  auth_subject TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_village_roles (
  user_id TEXT NOT NULL REFERENCES users(id),
  village_id TEXT NOT NULL REFERENCES villages(id),
  role TEXT NOT NULL CHECK(role IN ('VILLAGE_ADMIN','TOURNAMENT_ADMIN','SCORER','TEAM_MANAGER','PLAYER','VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY(user_id, village_id, role)
);

CREATE TABLE IF NOT EXISTS player_sequences (
  singleton_id INTEGER PRIMARY KEY CHECK(singleton_id = 1),
  last_value INTEGER NOT NULL DEFAULT 10000000
);
INSERT OR IGNORE INTO player_sequences(singleton_id,last_value) VALUES (1,10000000);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  sports_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth TEXT,
  identity_hmac TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING','VERIFIED','REJECTED','SUSPENDED')),
  verified_by TEXT REFERENCES users(id),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(village_id, identity_hmac)
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(village_id, name)
);

CREATE TABLE IF NOT EXISTS team_players (
  team_id TEXT NOT NULL REFERENCES teams(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  village_id TEXT NOT NULL REFERENCES villages(id),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(team_id, player_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'LEAGUE',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','REGISTRATION','LIVE','COMPLETED','CANCELLED')),
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  team_a_id TEXT NOT NULL REFERENCES teams(id),
  team_b_id TEXT NOT NULL REFERENCES teams(id),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','LIVE','INNINGS_BREAK','COMPLETED','ABANDONED')),
  current_innings INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scoring_events (
  event_id TEXT PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES villages(id),
  match_id TEXT NOT NULL REFERENCES matches(id),
  innings_no INTEGER NOT NULL,
  sequence_no INTEGER NOT NULL,
  device_id TEXT,
  actor_user_id TEXT REFERENCES users(id),
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, innings_no, sequence_no)
);
CREATE INDEX IF NOT EXISTS idx_scoring_events_match ON scoring_events(match_id, innings_no, sequence_no);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  village_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_village_time ON audit_events(village_id, created_at);

CREATE TABLE IF NOT EXISTS offline_sync_receipts (
  event_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  server_sequence INTEGER NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
