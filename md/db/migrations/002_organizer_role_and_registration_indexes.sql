-- Papel organizer: acesso restrito as inscricoes, sem gestao de conteudo.
-- O CHECK antigo so aceitava admin/editor, por isso e recriado.
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'editor', 'organizer'));

-- Indices que sustentam a paginacao por keyset: o par (timestamp, id) e sempre
-- comparado junto, entao o indice precisa cobrir as duas colunas na mesma ordem.
CREATE INDEX IF NOT EXISTS registrations_sync_idx ON registrations (updated_at, id);
CREATE INDEX IF NOT EXISTS registrations_created_idx ON registrations (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS registrations_status_created_idx
  ON registrations (status, created_at DESC, id DESC);
