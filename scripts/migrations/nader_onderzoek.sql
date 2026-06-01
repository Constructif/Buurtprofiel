-- ============================================================
-- NADER ONDERZOEK
-- Per gebied: onderzoeksonderwerpen (topics) met vragen/antwoorden
-- OneNote-stijl: links topics, rechts vragenlijst met vrije tekst
-- ============================================================

-- Topics: onderzoeksonderwerpen per buurt
CREATE TABLE IF NOT EXISTS nader_onderzoek_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buurtcode   TEXT NOT NULL,
  titel       TEXT NOT NULL,
  volgorde    INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  medewerker  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nader_onderzoek_topics_buurtcode
  ON nader_onderzoek_topics(buurtcode);

-- Vragen: vragen + antwoorden binnen een topic
CREATE TABLE IF NOT EXISTS nader_onderzoek_vragen (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id      UUID NOT NULL REFERENCES nader_onderzoek_topics(id) ON DELETE CASCADE,
  vraag         TEXT NOT NULL,
  antwoord      TEXT NOT NULL DEFAULT '',
  is_suggestie  BOOLEAN NOT NULL DEFAULT false,
  volgorde      INTEGER NOT NULL DEFAULT 0,
  medewerker    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nader_onderzoek_vragen_topic_id
  ON nader_onderzoek_vragen(topic_id);

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION nader_onderzoek_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nader_onderzoek_topics_touch ON nader_onderzoek_topics;
CREATE TRIGGER trg_nader_onderzoek_topics_touch
  BEFORE UPDATE ON nader_onderzoek_topics
  FOR EACH ROW EXECUTE FUNCTION nader_onderzoek_touch_updated_at();

DROP TRIGGER IF EXISTS trg_nader_onderzoek_vragen_touch ON nader_onderzoek_vragen;
CREATE TRIGGER trg_nader_onderzoek_vragen_touch
  BEFORE UPDATE ON nader_onderzoek_vragen
  FOR EACH ROW EXECUTE FUNCTION nader_onderzoek_touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Alle ingelogde gebruikers mogen topics/vragen lezen en muteren
-- (patroon gelijk aan wijkrondes)
-- ============================================================

ALTER TABLE nader_onderzoek_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nader_onderzoek_vragen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select topics"
  ON nader_onderzoek_topics FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert topics"
  ON nader_onderzoek_topics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update topics"
  ON nader_onderzoek_topics FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete topics"
  ON nader_onderzoek_topics FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated select vragen"
  ON nader_onderzoek_vragen FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert vragen"
  ON nader_onderzoek_vragen FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update vragen"
  ON nader_onderzoek_vragen FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete vragen"
  ON nader_onderzoek_vragen FOR DELETE
  USING (auth.role() = 'authenticated');
