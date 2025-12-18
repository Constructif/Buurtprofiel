# API Documentatie voor Buurtprofiel Dashboard

## Overzicht
Dit document bevat alle belangrijke API-endpoints en documentatie die nodig zijn voor het Buurtprofiel Dashboard project.

---

## 1. CBS Open Data API (OData v4)

### Algemene Documentatie
- **Snelstartgids OData v4**: https://www.cbs.nl/nl-nl/onze-diensten/open-data/statline-als-open-data/snelstartgids-odata-v4
- **CBS Open Data Hoofdpagina**: https://opendata.cbs.nl/ODataApi
- **Developer Portal**: https://developer.overheid.nl/apis/cbs-odata
- **GitHub Voorbeelden (Python, R, JS)**: https://github.com/statistiekcbs/CBS-Open-Data-v3

### Dataset 1: Kerncijfers Wijken en Buurten (47018NED)
**Endpoint**: `https://opendata.cbs.nl/ODataApi/odata/47018NED/TypedDataSet`

**Gebruikt voor**: Demografie, bevolking, woningen, huishoudens
- Bevolkingsdata (totaal, dichtheid, leeftijdsverdelingen)
- Migratieachtergrond (westers/niet-westers)
- Huishoudensdata (eenpersoons, met/zonder kinderen)
- Gemiddelde huishoudensgrootte

**Belangrijke velden**:
- `WijkenEnBuurten` - Area codes/IDs
- `Codering_3` - Geografische codes
- `TotaleBevolking_1` - Totale bevolking
- `Bevolkingsdichtheid_33` - Per km²
- Leeftijdsgroepen: `k_0Tot15Jaar_8`, `k_15Tot25Jaar_9`, etc.
- Migratie: `PersonenMetWestMigratieAcht_17`, `PersonenMetNietWestMigrAcht_18`

**Voorbeeld API call**:
```
https://opendata.cbs.nl/ODataApi/odata/47018NED/TypedDataSet?$filter=WijkenEnBuurten eq 'BU00000000'
```

### Dataset 2: Geregistreerde Criminaliteit (85984NED)
**Endpoint**: `https://opendata.cbs.nl/ODataApi/odata/85984NED/TypedDataSet`

**Gebruikt voor**: Criminaliteitscijfers per wijk/buurt
- Vermogensmisdrijven, vernielingen, geweldsmisdrijven
- Verkeersmisdrijven, overige misdrijven
- Tijdreeksen per periode

**Belangrijke velden**:
- `WijkenEnBuurten` - Area codes
- `RegioS` - Regio identificatie
- `VermogensmisdrijvenTotaal_1` - Vermogensmisdrijven
- `VernielEnBeschMisdrijvenTotaal_4` - Vernielingen
- `Gewelds_EnSeksueleMisdrijvenTot_7` - Geweldsmisdrijven
- `Perioden` - Tijdperiode

**StatLine pagina**: https://www.cbs.nl/nl-nl/cijfers/detail/83648NED

### API Specificaties
- **Format**: JSON/XML (via `$format=json`)
- **Filtering**: OData syntax (`$filter`, `$select`, `$orderby`)
- **Pagination**: `$skip`, `$top` (max 100.000 cellen per request)
- **Licentie**: Creative Commons CC BY 4.0
- **Rate limiting**: Geen strikte limits, maar redelijk gebruik
- **Authentication**: Niet vereist (publieke API)

### Voorbeeld Code (Python)
```python
import requests
import pandas as pd

def get_cbs_data(table_id, filters=None):
    url = f"https://opendata.cbs.nl/ODataApi/odata/{table_id}/TypedDataSet"
    params = {"$format": "json"}
    if filters:
        params["$filter"] = filters
    
    response = requests.get(url, params=params)
    data = response.json()
    return pd.DataFrame(data['value'])

# Voorbeeld gebruik
data = get_cbs_data('47018NED', "WijkenEnBuurten eq 'BU03630000'")
```

---

## 2. PDOK Locatieserver API v3.1

### Documentatie
- **OpenAPI Specificatie**: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ui/
- **GitHub Repository**: https://github.com/PDOK/locatieserver
- **Wiki Documentatie**: https://github.com/PDOK/locatieserver/wiki/API-Locatieserver
- **Officiële PDOK pagina**: https://www.pdok.nl/pdok-locatieserver

### Endpoints

#### A. Free Search (Geocoding)
**Endpoint**: `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free`

**Parameters**:
- `q` (required): Zoekterm
- `fq` (optional): Filters - bijvoorbeeld `type:wijk` of `type:buurt`
- `rows` (optional): Aantal resultaten (default: 10, max: 50)
- `start` (optional): Offset voor paginering

**Voorbeeld**:
```
https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=Amsterdam&fq=type:gemeente&rows=10
```

#### B. Suggest API (Autocomplete)
**Endpoint**: `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest`

**Parameters**:
- `q` (required): Zoekterm (mag incompleet zijn)
- `fq` (optional): Type filters
- `rows` (optional): Max resultaten

#### C. Lookup API (Detail ophalen)
**Endpoint**: `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup`

**Parameters**:
- `id` (required): Object ID van suggest resultaat

#### D. Reverse Geocoding
**Endpoint**: `https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse`

**Parameters**:
- `X` en `Y`: RD coördinaten, of
- `lat` en `lon`: WGS84 coördinaten
- `distance` (optional): Range in meters
- `rows` (optional): Max resultaten

**Voorbeeld**:
```
https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse?X=194195&Y=465885&distance=50&rows=30
```

### Type Filters
Voor `fq` parameter kun je filteren op:
- `type:adres` - Adressen
- `type:wijk` - Wijken
- `type:buurt` - Buurten
- `type:gemeente` - Gemeenten
- `type:woonplaats` - Woonplaatsen
- `type:weg` - Wegen
- `type:postcode` - Postcodes

### Specificaties
- **Format**: JSON (default), ook XML beschikbaar
- **CORS**: Enabled
- **Rate limiting**: Fair use policy, geen harde limits
- **Authentication**: Niet vereist
- **Coördinatensystemen**: RD (EPSG:28992) en WGS84 (EPSG:4326)

---

## 3. PDOK WFS - CBS Wijken en Buurten

### Documentatie
- **OGC API Specificatie (2023)**: https://api.pdok.nl/cbs/wijken-en-buurten-2023/ogc/v1?f=html
- **Dataset Info**: https://www.pdok.nl/ogc-apis/-/article/cbs-wijken-en-buurten
- **Cartografie Handleiding CBS**: https://www.cbs.nl/nl-nl/onze-diensten/open-data/statline-als-open-data/cartografie

### WFS Endpoint (Legacy maar stabiel)
**Base URL**: `https://service.pdok.nl/cbs/wijkenbuurten/2023/wfs/v1_0`

**Service**: `wijkenbuurten_2023:cbs_buurten_2023`

**Voorbeeld Query**:
```
https://service.pdok.nl/cbs/wijkenbuurten/2023/wfs/v1_0?
  service=WFS&
  version=2.0.0&
  request=GetFeature&
  typeName=wijkenbuurten_2023:cbs_buurten_2023&
  outputFormat=application/json&
  CQL_FILTER=statcode='BU03630000'
```

### Nieuwe OGC API Features (Aanbevolen)
**Base URL**: `https://api.pdok.nl/cbs/wijken-en-buurten-2023/ogc/v1`

**Collections**:
- `/collections/buurten` - Buurten
- `/collections/wijken` - Wijken
- `/collections/gemeenten` - Gemeenten

**Voorbeeld**:
```
https://api.pdok.nl/cbs/wijken-en-buurten-2023/ogc/v1/collections/buurten/items?f=json&statcode=BU03630000
```

### Response Format
Returns GeoJSON met:
- Geometrie (polygonen)
- Properties inclusief:
  - `statcode` - CBS code voor koppeling met CBS data
  - `naam` - Naam van de buurt
  - Optioneel: kerncijfers zoals oppervlakte

### Specificaties
- **Format**: GeoJSON, GML
- **Coördinaten**: RD (EPSG:28992) standaard, WGS84 optioneel via `srsName` parameter
- **Pagination**: Via `count` en `startIndex` parameters
- **Max features per request**: 1000 (WFS), onbeperkt via OGC API
- **Rate limiting**: Fair use

---

## 4. Overpass API (OpenStreetMap)

### Documentatie
- **Wiki Hoofdpagina**: https://wiki.openstreetmap.org/wiki/Overpass_API
- **Language Guide**: https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
- **Overpass QL Reference**: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
- **Voorbeelden**: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example
- **User Manual**: https://dev.overpass-api.de/overpass-doc/en/
- **Interactive Editor (Turbo)**: https://overpass-turbo.eu/

### Endpoint
**Base URL**: `https://overpass-api.de/api/interpreter`

### Query Format (Overpass QL)
```
[out:json];
(
  node[amenity=school](around:1000,52.0907,5.1214);
  way[amenity=school](around:1000,52.0907,5.1214);
  relation[amenity=school](around:1000,52.0907,5.1214);
);
out center;
```

### Common Amenity Types voor Voorzieningen
```
amenity=school          - Scholen
shop=supermarket        - Supermarkten
amenity=restaurant      - Restaurants
amenity=cafe            - Cafés
amenity=bank            - Banken
amenity=pharmacy        - Apotheken
amenity=hospital        - Ziekenhuizen
amenity=library         - Bibliotheken
leisure=park            - Parken
amenity=parking         - Parkeerplaatsen
```

### Voorbeeld Query (binnen bounding box)
```
[out:json];
(
  node[amenity=supermarket](52.05,5.08,52.10,5.15);
  way[amenity=supermarket](52.05,5.08,52.10,5.15);
);
out center;
```

### Python Voorbeeld
```python
import requests

def query_overpass(query):
    url = "https://overpass-api.de/api/interpreter"
    response = requests.post(url, data={'data': query})
    return response.json()

# Query voor scholen in de buurt van coördinaat
query = """
[out:json];
node[amenity=school](around:1000,52.0907,5.1214);
out center;
"""

data = query_overpass(query)
```

### Specificaties
- **Format**: JSON, XML, CSV
- **Rate limiting**: 
  - Max 2 concurrent requests per IP
  - Timeout na 180 seconden
  - Fair use, geen harde daily limits
- **Best practices**:
  - Cache resultaten waar mogelijk
  - Gebruik kleinere bounding boxes
  - Beperk aantal amenity types per query
- **Authentication**: Niet vereist

---

## 5. Externe Libraries voor Kaartweergave

### Leaflet.js
**CDN**: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
**CSS**: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
**Documentatie**: https://leafletjs.com/reference.html

### Chart.js
**CDN**: `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js`
**Documentatie**: https://www.chartjs.org/docs/latest/

### OpenStreetMap Tiles
**Tile URL**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
**Attribution**: Required - `© OpenStreetMap contributors`

---

## Samenvatting voor Next.js API Routes

### Benodigde Environment Variables
```env
# Optioneel: voor rate limiting tracking
REDIS_URL=...

# Geen API keys nodig - alle APIs zijn publiek
```

### Aanbevolen API Route Structuur
```
/app/api/
├── cbs/
│   ├── buurten/route.ts          # 47018NED data
│   └── criminaliteit/route.ts    # 85984NED data
├── geocoding/
│   ├── search/route.ts           # PDOK free search
│   └── reverse/route.ts          # PDOK reverse geocoding
├── geography/
│   └── boundaries/route.ts       # PDOK WFS grenzen
└── amenities/
    └── search/route.ts           # Overpass voorzieningen
```

### Caching Strategie
- **CBS data**: Cache 24 uur (wijzigt weinig)
- **PDOK geocoding**: Cache 7 dagen (stabiel)
- **PDOK boundaries**: Cache 30 dagen (jaarcyclus)
- **Overpass**: Cache 1 uur (dynamischer)

---

## Support & Community

### CBS
- **Support**: https://www.cbs.nl/nl-nl/over-ons/contact
- **Licentie**: CC BY 4.0

### PDOK
- **Support email**: info@pdok.nl
- **GitHub Issues**: https://github.com/PDOK/locatieserver/issues
- **Licentie**: CC0 (Public Domain)

### Overpass/OSM
- **Forum**: https://help.openstreetmap.org/
- **Licentie**: ODbL (Open Database License)

---

## Tips voor Development

1. **Gebruik TypeScript types** voor API responses
2. **Implementeer error handling** met fallbacks
3. **Add request timeouts** (CBS: 30s, PDOK: 10s, Overpass: 180s)
4. **Monitor rate limits** vooral voor Overpass
5. **Test met verschillende gebieden** (stad vs landelijk)
6. **Cache agressief** waar mogelijk
7. **Gebruik server-side fetching** om CORS te vermijden

