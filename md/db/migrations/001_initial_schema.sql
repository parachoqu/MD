CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  name text NOT NULL,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email = lower(email))
);

CREATE TABLE admin_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_hash text,
  user_agent_hash text,
  rotated_from_id text REFERENCES admin_sessions(id) ON DELETE SET NULL,
  CHECK (expires_at > created_at)
);

CREATE INDEX admin_sessions_user_active_idx
  ON admin_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE password_reset_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  requested_ip_hash text,
  CHECK (expires_at > created_at)
);

CREATE TABLE events (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  draft_data jsonb NOT NULL,
  published_data jsonb,
  editorial_status text NOT NULL DEFAULT 'draft' CHECK (editorial_status IN ('draft', 'published', 'archived')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  published_revision integer NOT NULL DEFAULT 0 CHECK (published_revision >= 0 AND published_revision <= revision),
  created_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  published_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  CHECK (jsonb_typeof(draft_data) = 'object'),
  CHECK (published_data IS NULL OR jsonb_typeof(published_data) = 'object')
);

CREATE INDEX events_editorial_status_idx ON events (editorial_status, deleted_at);
CREATE INDEX events_published_idx ON events (published_at DESC) WHERE editorial_status = 'published' AND deleted_at IS NULL;

CREATE TABLE projects (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  published_sort_order integer CHECK (published_sort_order IS NULL OR published_sort_order >= 0),
  draft_data jsonb NOT NULL,
  published_data jsonb,
  editorial_status text NOT NULL DEFAULT 'draft' CHECK (editorial_status IN ('draft', 'published', 'archived')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  published_revision integer NOT NULL DEFAULT 0 CHECK (published_revision >= 0 AND published_revision <= revision),
  created_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  published_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  CHECK (jsonb_typeof(draft_data) = 'object'),
  CHECK (published_data IS NULL OR jsonb_typeof(published_data) = 'object')
);

CREATE INDEX projects_order_idx ON projects (sort_order, id) WHERE deleted_at IS NULL;
CREATE INDEX projects_editorial_status_idx ON projects (editorial_status, deleted_at);

CREATE TABLE site_pages (
  id text PRIMARY KEY,
  draft_data jsonb NOT NULL,
  published_data jsonb,
  editorial_status text NOT NULL DEFAULT 'draft' CHECK (editorial_status IN ('draft', 'published', 'archived')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  published_revision integer NOT NULL DEFAULT 0 CHECK (published_revision >= 0 AND published_revision <= revision),
  created_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  published_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  CHECK (jsonb_typeof(draft_data) = 'object'),
  CHECK (published_data IS NULL OR jsonb_typeof(published_data) = 'object')
);

CREATE TABLE site_settings (
  id text PRIMARY KEY DEFAULT 'global',
  draft_data jsonb NOT NULL,
  published_data jsonb,
  editorial_status text NOT NULL DEFAULT 'draft' CHECK (editorial_status IN ('draft', 'published', 'archived')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  published_revision integer NOT NULL DEFAULT 0 CHECK (published_revision >= 0 AND published_revision <= revision),
  created_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  published_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  CHECK (id = 'global'),
  CHECK (jsonb_typeof(draft_data) = 'object'),
  CHECK (published_data IS NULL OR jsonb_typeof(published_data) = 'object')
);

CREATE TABLE media_assets (
  id text PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('static', 'vercel_blob')),
  storage_key text,
  url text NOT NULL,
  label text NOT NULL,
  alt_text text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  original_filename text,
  read_only boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by text REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK ((provider = 'static' AND storage_key IS NULL) OR (provider = 'vercel_blob' AND storage_key IS NOT NULL))
);

CREATE UNIQUE INDEX media_assets_storage_key_idx
  ON media_assets (storage_key)
  WHERE storage_key IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE media_usages (
  media_id text NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  entity_type text NOT NULL CHECK (entity_type IN ('event', 'project', 'site_page', 'site_settings')),
  entity_id text NOT NULL,
  field_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, entity_type, entity_id, field_path)
);

CREATE TABLE audit_logs (
  id text PRIMARY KEY,
  actor_user_id text REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_label text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  previous_revision integer,
  new_revision integer,
  result text NOT NULL CHECK (result IN ('success', 'failure')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE TABLE registrations (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  protocol text NOT NULL UNIQUE,
  category_id text NOT NULL,
  registration_type text NOT NULL DEFAULT 'team' CHECK (registration_type IN ('team', 'individual')),
  team_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'confirmed', 'cancelled', 'rejected')),
  regulation_id text,
  regulation_version text,
  regulation_published_at timestamptz,
  idempotency_key_hash text NOT NULL UNIQUE,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(team_data) = 'object')
);

CREATE INDEX registrations_event_status_idx ON registrations (event_id, status, created_at DESC);

CREATE TABLE registration_responsibles (
  id text PRIMARY KEY,
  registration_id text NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX registration_responsibles_registration_idx ON registration_responsibles (registration_id);

CREATE TABLE registration_members (
  id text PRIMARY KEY,
  registration_id text NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  member_type text NOT NULL CHECK (member_type IN ('athlete', 'staff')),
  name text NOT NULL,
  birth_date date,
  jersey_number text,
  role text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX registration_members_registration_idx ON registration_members (registration_id, member_type, sort_order);

CREATE TABLE registration_consents (
  id text PRIMARY KEY,
  registration_id text NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  consent_type text NOT NULL CHECK (consent_type IN ('accuracy', 'privacy', 'regulation')),
  consent_version text NOT NULL,
  accepted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, consent_type)
);

CREATE TABLE contact_messages (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reading', 'replied', 'archived', 'spam')),
  idempotency_key_hash text NOT NULL UNIQUE,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_messages_status_idx ON contact_messages (status, created_at DESC);

CREATE TABLE rate_limit_buckets (
  scope text NOT NULL,
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, subject_hash, window_start)
);

CREATE INDEX rate_limit_blocked_idx ON rate_limit_buckets (scope, subject_hash, blocked_until);

CREATE TABLE idempotency_keys (
  scope text NOT NULL,
  key_hash text NOT NULL,
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  resource_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope, key_hash),
  CHECK (expires_at > created_at),
  CHECK (response_body IS NULL OR jsonb_typeof(response_body) = 'object')
);

CREATE INDEX idempotency_keys_expiry_idx ON idempotency_keys (expires_at);
