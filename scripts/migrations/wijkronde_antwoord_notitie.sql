-- ============================================================
-- WIJKRONDE: eigen notitie bij een antwoord
-- Bij multiple-choice-vragen (ja-nee, score, keuze) kan de medewerker
-- een korte eigen toelichting toevoegen naast het gekozen antwoord.
-- De notitie hoort bij dezelfde rij als het antwoord (per ronde+vraag).
-- ============================================================

ALTER TABLE wijkronde_antwoorden ADD COLUMN IF NOT EXISTS notitie TEXT;

-- ------------------------------------------------------------
-- RLS: authenticated gebruikers mogen antwoorden bijwerken.
-- upsertAntwoord() doet een upsert op conflict (ronde_id, vraag_id):
-- bij een bestaande rij is dat een UPDATE. Zonder UPDATE-policy raakt
-- die 0 rijen en blijft de notitie (en gewijzigd antwoord) onbewaard
-- na heropenen. Zelfde patroon als de fix op wijkrondes.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated update wijkronde_antwoorden" ON wijkronde_antwoorden;
CREATE POLICY "Authenticated update wijkronde_antwoorden"
  ON wijkronde_antwoorden FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
