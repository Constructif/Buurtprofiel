-- ============================================================
-- WIJKRONDE: vragenlijst opslaan/afsluiten
-- Status van de vragenlijst, los van de ronde-status (actief/afgerond).
-- Observaties kunnen na het afsluiten van de vragenlijst nog toegevoegd worden.
-- ============================================================

ALTER TABLE wijkrondes ADD COLUMN IF NOT EXISTS vragen_opgeslagen    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE wijkrondes ADD COLUMN IF NOT EXISTS vragen_observator    TEXT;
ALTER TABLE wijkrondes ADD COLUMN IF NOT EXISTS vragen_opgeslagen_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- RLS: authenticated gebruikers mogen rondes bijwerken.
-- Ontbrak; daardoor raakte een UPDATE 0 rijen (PGRST116 / 406).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated update wijkrondes" ON wijkrondes;
CREATE POLICY "Authenticated update wijkrondes"
  ON wijkrondes FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
