-- ============================================================
-- FAVORIETEN: per gebruiker favoriete gebieden bewaren
-- Elke ingelogde gebruiker kan buurten/wijken/gemeenten als favoriet
-- markeren. Favorieten zijn privé (alleen eigen rijen zichtbaar).
-- ============================================================

CREATE TABLE IF NOT EXISTS user_favorieten (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gebied_code          TEXT NOT NULL,  -- CBS code (BU/WK/GM...)
  gebied_naam          TEXT NOT NULL,  -- snapshot van naam (geen FK naar read-only gebieden)
  gebied_type          TEXT NOT NULL CHECK (gebied_type IN ('buurt','wijk','gemeente')),
  gebied_gemeente_naam TEXT,           -- gemeente waarin het gebied ligt (null voor gemeente zelf)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, gebied_code)
);

-- Voor bestaande installaties: kolom toevoegen als die nog ontbreekt.
ALTER TABLE user_favorieten ADD COLUMN IF NOT EXISTS gebied_gemeente_naam TEXT;

ALTER TABLE user_favorieten ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS: gebruiker ziet/beheert ALLEEN eigen favorieten
-- (i.t.t. de read-only gebieden-tabel die voor iedereen leesbaar is).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Eigen favorieten select" ON user_favorieten;
CREATE POLICY "Eigen favorieten select"
  ON user_favorieten FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigen favorieten insert" ON user_favorieten;
CREATE POLICY "Eigen favorieten insert"
  ON user_favorieten FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Eigen favorieten delete" ON user_favorieten;
CREATE POLICY "Eigen favorieten delete"
  ON user_favorieten FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorieten_user ON user_favorieten(user_id);
