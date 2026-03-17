-- Buurtprofiel Database Schema
-- Supabase / PostgreSQL met PostGIS

-- Extensies
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- GEBIEDEN (master registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS gebieden (
  code          TEXT PRIMARY KEY,
  naam          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('buurt', 'wijk', 'gemeente')),
  wijk_code     TEXT,
  wijk_naam     TEXT,
  gemeente_code TEXT,
  gemeente_naam TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gebieden_type ON gebieden(type);
CREATE INDEX IF NOT EXISTS idx_gebieden_gemeente ON gebieden(gemeente_code);
CREATE INDEX IF NOT EXISTS idx_gebieden_naam_trgm ON gebieden USING gin (naam gin_trgm_ops);

-- ============================================================
-- KERNCIJFERS (CBS 85984NED - bevolking, huishoudens, woningen, inkomen, jeugdzorg/wmo)
-- ============================================================
CREATE TABLE IF NOT EXISTS kerncijfers (
  code          TEXT NOT NULL REFERENCES gebieden(code),
  jaar          INTEGER NOT NULL,
  bevolking     JSONB NOT NULL,
  huishoudens   JSONB NOT NULL,
  woningen      JSONB NOT NULL,
  inkomen       JSONB NOT NULL,
  jeugdzorg_wmo JSONB,
  uitkeringen   JSONB,
  imported_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (code, jaar)
);

-- ============================================================
-- CRIMINALITEIT (CBS 47018NED)
-- ============================================================
CREATE TABLE IF NOT EXISTS criminaliteit (
  code        TEXT NOT NULL REFERENCES gebieden(code),
  jaar        INTEGER NOT NULL,
  data        JSONB NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (code, jaar)
);

-- ============================================================
-- OPLEIDING (CBS 86052NED)
-- ============================================================
CREATE TABLE IF NOT EXISTS opleiding (
  code        TEXT NOT NULL REFERENCES gebieden(code),
  jaar        INTEGER NOT NULL,
  laag        REAL,
  midden      REAL,
  hoog        REAL,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (code, jaar)
);

-- ============================================================
-- WERKGELEGENHEID (CBS 85618NED)
-- ============================================================
CREATE TABLE IF NOT EXISTS werkgelegenheid (
  code                TEXT NOT NULL REFERENCES gebieden(code),
  jaar                INTEGER NOT NULL,
  arbeidsparticipatie REAL,
  werknemers          REAL,
  zelfstandigen       REAL,
  vast                REAL,
  flexibel            REAL,
  imported_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (code, jaar)
);

-- ============================================================
-- HERKOMST LAND (CBS 85640NED - per gemeente)
-- ============================================================
CREATE TABLE IF NOT EXISTS herkomst_land (
  gemeente_code      TEXT NOT NULL REFERENCES gebieden(code),
  jaar               INTEGER NOT NULL,
  totaal             INTEGER NOT NULL DEFAULT 0,
  landen             JSONB NOT NULL,
  gemeente_bevolking JSONB,
  imported_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (gemeente_code, jaar)
);

-- ============================================================
-- BEVOLKINGS DYNAMIEK (CBS 37230ned - per gemeente, meerdere jaren)
-- ============================================================
CREATE TABLE IF NOT EXISTS bevolkings_dynamiek (
  gemeente_code TEXT NOT NULL REFERENCES gebieden(code),
  jaar          INTEGER NOT NULL,
  geboorte      INTEGER NOT NULL DEFAULT 0,
  sterfte       INTEGER NOT NULL DEFAULT 0,
  vestiging     INTEGER,
  vertrek       INTEGER,
  saldo         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gemeente_code, jaar)
);

-- ============================================================
-- RIVM GEZONDHEID (50120NED)
-- ============================================================
CREATE TABLE IF NOT EXISTS rivm_gezondheid (
  code               TEXT NOT NULL REFERENCES gebieden(code),
  jaar               INTEGER NOT NULL,
  eenzaamheid        JSONB,
  mentale_gezondheid JSONB,
  zorg_ondersteuning JSONB,
  imported_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (code, jaar)
);

-- ============================================================
-- BODEMGEBRUIK (CBS 86211NED - per gemeente)
-- ============================================================
CREATE TABLE IF NOT EXISTS bodemgebruik (
  gemeente_code      TEXT NOT NULL REFERENCES gebieden(code),
  jaar               INTEGER NOT NULL,
  totaal_oppervlakte REAL,
  stedelijk_groen    REAL,
  sportterrein       REAL,
  recreatief_terrein REAL,
  natuurlijk_terrein REAL,
  imported_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (gemeente_code, jaar)
);

-- ============================================================
-- GROENPERCENTAGE (RIVM WFS)
-- ============================================================
CREATE TABLE IF NOT EXISTS groenpercentage (
  code        TEXT NOT NULL REFERENCES gebieden(code),
  jaar        INTEGER NOT NULL DEFAULT 2022,
  percentage  REAL,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (code, jaar)
);

-- ============================================================
-- VOORZIENINGEN (OSM/Overpass - PostGIS Points)
-- ============================================================
CREATE TABLE IF NOT EXISTS voorzieningen (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  name        TEXT NOT NULL,
  location    GEOMETRY(Point, 4326) NOT NULL,
  tags        JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voorzieningen_type ON voorzieningen(type);
CREATE INDEX IF NOT EXISTS idx_voorzieningen_geom ON voorzieningen USING gist (location);

-- ============================================================
-- DATA METADATA (freshness tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS data_metadata (
  dataset_id         TEXT PRIMARY KEY,
  dataset_naam       TEXT NOT NULL,
  bron               TEXT NOT NULL,
  latest_period      TEXT,
  last_imported_at   TIMESTAMPTZ,
  last_checked_at    TIMESTAMPTZ,
  new_data_available BOOLEAN DEFAULT FALSE,
  new_period_found   TEXT,
  row_count          INTEGER,
  notes              TEXT
);

-- ============================================================
-- FUNCTIES
-- ============================================================

-- Spatial query voor voorzieningen binnen een bounding box
CREATE OR REPLACE FUNCTION get_voorzieningen_in_bbox(
  south float, west float, north float, east float
)
RETURNS SETOF voorzieningen AS $$
  SELECT * FROM voorzieningen
  WHERE ST_Within(location, ST_MakeEnvelope(west, south, east, north, 4326));
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS op alle tabellen
ALTER TABLE gebieden ENABLE ROW LEVEL SECURITY;
ALTER TABLE kerncijfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminaliteit ENABLE ROW LEVEL SECURITY;
ALTER TABLE opleiding ENABLE ROW LEVEL SECURITY;
ALTER TABLE werkgelegenheid ENABLE ROW LEVEL SECURITY;
ALTER TABLE herkomst_land ENABLE ROW LEVEL SECURITY;
ALTER TABLE bevolkings_dynamiek ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivm_gezondheid ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodemgebruik ENABLE ROW LEVEL SECURITY;
ALTER TABLE groenpercentage ENABLE ROW LEVEL SECURITY;
ALTER TABLE voorzieningen ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_metadata ENABLE ROW LEVEL SECURITY;

-- Public read policies (iedereen mag lezen)
CREATE POLICY "Public read" ON gebieden FOR SELECT USING (true);
CREATE POLICY "Public read" ON kerncijfers FOR SELECT USING (true);
CREATE POLICY "Public read" ON criminaliteit FOR SELECT USING (true);
CREATE POLICY "Public read" ON opleiding FOR SELECT USING (true);
CREATE POLICY "Public read" ON werkgelegenheid FOR SELECT USING (true);
CREATE POLICY "Public read" ON herkomst_land FOR SELECT USING (true);
CREATE POLICY "Public read" ON bevolkings_dynamiek FOR SELECT USING (true);
CREATE POLICY "Public read" ON rivm_gezondheid FOR SELECT USING (true);
CREATE POLICY "Public read" ON bodemgebruik FOR SELECT USING (true);
CREATE POLICY "Public read" ON groenpercentage FOR SELECT USING (true);
CREATE POLICY "Public read" ON voorzieningen FOR SELECT USING (true);
CREATE POLICY "Public read" ON data_metadata FOR SELECT USING (true);

-- ============================================================
-- EMAIL LOG (magic link rate limit tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON email_log FOR SELECT USING (true);
CREATE POLICY "Public insert" ON email_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- INITIELE DATA METADATA
-- ============================================================
INSERT INTO data_metadata (dataset_id, dataset_naam, bron, notes) VALUES
  ('85984NED', 'Kerncijfers Wijken en Buurten', 'cbs', 'Dataset-ID verschilt per jaar'),
  ('47018NED', 'Criminaliteit', 'cbs', 'Gedetailleerde misdrijfstatistieken'),
  ('85640NED', 'Herkomstland per PC4', 'cbs', 'Bevolking per land van herkomst'),
  ('86052NED', 'Opleidingsniveau', 'cbs', 'Laag/midden/hoog per buurt'),
  ('85618NED', 'Werkgelegenheid', 'cbs', 'Arbeidsparticipatie en contracttypes'),
  ('86211NED', 'Bodemgebruik', 'cbs', 'Groen, sport, natuur per gemeente'),
  ('37230ned', 'Bevolkingsdynamiek', 'cbs', 'Geboorte, sterfte, migratie per gemeente'),
  ('50120NED', 'Gezondheidsmonitor', 'rivm', 'Eenzaamheid, mentale gezondheid, zorg'),
  ('rivm_wfs_groen', 'Groenpercentage', 'rivm', 'RIVM WFS groenpercentage kaart'),
  ('osm_voorzieningen', 'Voorzieningen', 'osm', '9 types: scholen, huisartsen, etc.')
ON CONFLICT (dataset_id) DO NOTHING;

-- ============================================================
-- FUNCTIE: Actieve gebieden (alleen codes die in kerncijfers bestaan voor een bepaald jaar)
-- ============================================================
CREATE OR REPLACE FUNCTION get_actieve_gebieden(target_jaar INTEGER DEFAULT 2025)
RETURNS TABLE (
  code TEXT,
  naam TEXT,
  type TEXT,
  wijk_code TEXT,
  wijk_naam TEXT,
  gemeente_code TEXT,
  gemeente_naam TEXT
) AS $$
  SELECT g.code, g.naam, g.type, g.wijk_code, g.wijk_naam, g.gemeente_code, g.gemeente_naam
  FROM gebieden g
  WHERE EXISTS (SELECT 1 FROM kerncijfers k WHERE k.code = g.code AND k.jaar = target_jaar)
  ORDER BY g.type, g.naam;
$$ LANGUAGE sql STABLE;
