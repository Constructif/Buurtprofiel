-- ============================================================
-- WIJKRONDE: afgebakend gebied (polygoon) per ronde
-- Het gebied dat tijdens de wijkronde daadwerkelijk gelopen/gescand is.
-- Opgeslagen als jsonb: { "punten": [[lat, lng], ...] } (Leaflet-volgorde).
-- Eén gebied per ronde. NULL = nog geen gebied afgebakend.
-- De UPDATE-policy "Authenticated update wijkrondes" bestaat al
-- (zie wijkronde_vragen_opslaan.sql) en dekt deze kolom mee.
-- ============================================================

ALTER TABLE wijkrondes ADD COLUMN IF NOT EXISTS gebied_polygon jsonb;
