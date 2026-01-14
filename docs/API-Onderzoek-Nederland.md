# Nederlandse Open Data API's voor Buurtprofiel Dashboard

## Overzicht

Dit document bevat een uitgebreid overzicht van Nederlandse open data API's die gebruikt kunnen worden voor een Buurtprofiel dashboard met data op buurt-, wijk- en gemeenteniveau.

**Laatst bijgewerkt:** Januari 2025

---

## Inhoudsopgave

1. [Woningtypes](#1-woningtypes)
2. [Specifieke Criminaliteit](#2-specifieke-criminaliteit)
3. [Verhuisbewegingen](#3-verhuisbewegingen)
4. [Woningcorporaties](#4-woningcorporaties)
5. [Voorzieningen](#5-voorzieningen)
6. [Zorg & Welzijn](#6-zorg--welzijn)
7. [Werk & Inkomen](#7-werk--inkomen)
8. [Leefomgeving](#8-leefomgeving)
9. [Trends / Historische Data](#9-trends--historische-data)
10. [Geografische Grenzen en Kaarten](#10-geografische-grenzen-en-kaarten)
11. [Samenvatting API Endpoints](#samenvatting-api-endpoints)
12. [CBS Gebiedscodes](#cbs-gebiedscodes)

---

## 1. Woningtypes

### CBS Kerncijfers Wijken en Buurten

| Aspect | Details |
|--------|---------|
| **Databron** | CBS (Centraal Bureau voor de Statistiek) |
| **Datasets** | 85318NED (2022), 85618NED (2023), 85984NED (2024), 86165NED (2025) |
| **API Endpoint** | `https://datasets.cbs.nl/odata/v1/CBS/{tabelID}` |
| **Gratis/Open** | Ja, volledig gratis en open (CC BY 4.0) |
| **Beschikbare data** | Appartement, tussenwoning, hoekwoning, twee-onder-een-kap, vrijstaande woning |

**Relevante velden voor woningtypes:**
- Percentage meergezinswoningen (appartementen)
- Percentage eengezinswoningen
- Onderverdeling naar type (tussenwoning, hoekwoning, 2^1kap, vrijstaand)

**Filteren op buurt/wijk/gemeente:**
```
# Filter op gemeente Amsterdam
$filter=startswith(WijkenEnBuurten,'GM0363')

# Filter op wijk
$filter=startswith(WijkenEnBuurten,'WK')

# Filter op buurt
$filter=startswith(WijkenEnBuurten,'BU')

# Filter op specifieke buurt
$filter=WijkenEnBuurten eq 'BU03630000'
```

**Voorbeeld API call:**
```
https://datasets.cbs.nl/odata/v1/CBS/85984NED/Observations?$filter=WijkenEnBuurten eq 'BU03630000'
```

**Aanvullende dataset voor woningvoorraad:**
- **85035NED** - Woningvoorraad; woningtype op 1 januari, regio
- Bron: BAG en Kadaster

---

## 2. Specifieke Criminaliteit

### Politie Open Data via CBS

| Aspect | Details |
|--------|---------|
| **Databron** | Politie / CBS |
| **Dataset** | 47018NED |
| **API Endpoint OData v3** | `https://opendata.cbs.nl/ODataApi/odata/47018NED/TypedDataSet` |
| **Portal** | [data.politie.nl](https://data.politie.nl/) |
| **Gratis/Open** | Ja (CC BY 4.0) |

**Beschikbare misdrijftypen en veldnamen:**

| Veld | Beschrijving |
|------|--------------|
| `TotaalGeregistreerdeMisdrijven_1` | Totaal geregistreerde misdrijven |
| `Gewelds_EnSeksueleMisdrijvenTot_7` | Geweldsmisdrijven totaal |
| `VermogensmisdrijvenTotaal_1` | Vermogensmisdrijven totaal |
| `VernielEnBeschMisdrijvenTotaal_4` | Vernielingen totaal |
| `DiefstUitWoningSchAGarage_12` | Diefstal/inbraak uit woning, schuur, garage |
| `DiefstVanafUitMotorvrtgnTot_15` | Diefstal van/uit motorvoertuigen |
| `DiefstVanMotorvrtgnTotaal_16` | Diefstal van motorvoertuigen |
| `InbraakWoning_4` | Woninginbraak specifiek |

**Voorbeeld API call:**
```
https://opendata.cbs.nl/ODataApi/odata/47018NED/TypedDataSet?$filter=WijkenEnBuurten eq 'BU03630000'
```

**Data granulariteit:**
- Jaarcijfers vanaf 2015 op wijk/buurtniveau
- Maandcijfers op gemeenteniveau

**Dashboard visualisatie CBS:**
- [CBS Dashboard Misdrijven in de Buurt](https://www.cbs.nl/nl-nl/visualisaties/politie/dashboard-misdrijven-in-de-buurt/maandcijfers)

---

## 3. Verhuisbewegingen

### CBS Verhuizingendashboard

| Aspect | Details |
|--------|---------|
| **Databron** | CBS |
| **Dashboard** | [dashboards.cbs.nl/v3/verhuizingendashboard](https://dashboards.cbs.nl/v3/verhuizingendashboard/) |
| **Gratis/Open** | Ja |
| **Beschikbare data** | Verhuizingen tussen gemeenten, tussen wijken, van/naar buitenland |

**Downloads beschikbaar (CSV):**
- Verhuizingen tussen gemeenten (deel 1 en 2)
- Verhuizingen tussen wijken (deel 1 en 2)
- Verhuizingen vanuit en naar het buitenland
- Huishoudsamenstelling verhuizers

**Periode:** 2017 t/m 2022

**Doelgroepen in de data:**
- Jonge gezinnen
- Middeninkomens
- Studenten
- Ouderen
- etc.

**Opmerking:** Geen directe API, data moet gedownload worden als CSV.

### CBS Bevolkingsdynamiek datasets

| Dataset | Beschrijving |
|---------|--------------|
| **83500NED** | Bevolkingsontwikkeling; regio per maand |
| **37259ned** | Bevolking; herkomstgroepering, regio |

---

## 4. Woningcorporaties

### Aedes Datacentrum

| Aspect | Details |
|--------|---------|
| **Databron** | Aedes (branchevereniging woningcorporaties) |
| **Portal** | [aedesdatacentrum.nl](https://aedesdatacentrum.nl/) |
| **Gratis/Open** | **Deels** - sommige data is openbaar, veel achter login |
| **Beschikbare data** | Leefbaarheid, duurzaamheid, aantal sociale huurwoningen, bedrijfsvoering |

**Lokale Monitor Wonen:**
- Betaalbaarheid en beschikbaarheid sociale huurwoningen per gemeente
- Data van WoonOnderzoek Nederland (WoON)

**Corporatie-informatie per gemeente:**
- [Aedes Woningcorporaties per gemeente](https://aedes.nl/woningcorporaties/overzichten)

**Opmerking:** Geen directe publieke API. Data voornamelijk toegankelijk voor aangesloten corporaties. Voor basisinformatie kun je de gemeentepagina's scrapen of handmatig invoeren.

### Alternatief: BAG Data

Via de BAG kun je zien welke woningen in bezit zijn van rechtspersonen (corporaties), maar dit vereist complexe analyse.

---

## 5. Voorzieningen

### 5a. Scholen - DUO Open Onderwijsdata

| Aspect | Details |
|--------|---------|
| **Databron** | DUO (Dienst Uitvoering Onderwijs) |
| **API Portal** | [duo.nl/open_onderwijsdata](https://duo.nl/open_onderwijsdata/) |
| **Data Downloads** | [duo.nl/open_onderwijsdata/databestanden](https://duo.nl/open_onderwijsdata/databestanden/) |
| **Gratis/Open** | Ja |

**Beschikbare datasets:**

| Type | Data |
|------|------|
| **Basisonderwijs** | Adressen, leerlingaantallen, denominatie |
| **Voortgezet onderwijs** | Adressen, aantallen per vestiging, schoolsoort |
| **Speciaal onderwijs** | Locaties, types |
| **MBO** | Instellingen, opleidingen |
| **HBO/WO** | Instellingen, vestigingen |

**Data per school:**
- BRIN nummer (unieke identificatie)
- Vestigingsadres met postcode
- Correspondentieadres
- Bijhorend schoolbestuur
- Denominatie (openbaar, katholiek, protestants, etc.)
- Aantal leerlingen/studenten

**Voorbeeld databestand URL:**
```
https://duo.nl/open_onderwijsdata/databestanden/vo/adressen/adressen-vo.csv
```

### 5b. Winkels, Supermarkten, Horeca - OpenStreetMap Overpass API

| Aspect | Details |
|--------|---------|
| **Databron** | OpenStreetMap |
| **API Endpoint** | `https://overpass-api.de/api/interpreter` |
| **Web Interface** | [overpass-turbo.eu](https://overpass-turbo.eu/) |
| **Gratis/Open** | Ja (ODbL licentie) |

**Relevante OSM tags:**

| Tag | Beschrijving |
|-----|--------------|
| `shop=supermarket` | Supermarkten (Albert Heijn, Jumbo, etc.) |
| `shop=convenience` | Gemakswinkels, avondwinkels |
| `shop=bakery` | Bakkers |
| `shop=butcher` | Slagers |
| `shop=*` | Alle winkels |
| `amenity=restaurant` | Restaurants |
| `amenity=cafe` | Cafes |
| `amenity=bar` | Bars |
| `amenity=fast_food` | Fast food |
| `amenity=pub` | Kroegen |
| `tourism=hotel` | Hotels |

**Voorbeeld Overpass query voor supermarkten in een bounding box:**
```
[out:json][timeout:25];
(
  node["shop"="supermarket"](52.3,4.8,52.4,4.95);
  way["shop"="supermarket"](52.3,4.8,52.4,4.95);
);
out body;
>;
out skel qt;
```

**Voorbeeld Overpass query voor alle voorzieningen in een gebied:**
```
[out:json][timeout:25];
area["name"="Amsterdam"]->.searchArea;
(
  node["shop"](area.searchArea);
  node["amenity"~"restaurant|cafe|bar"](area.searchArea);
);
out body;
```

### 5c. OV Haltes en Stations

| Bron | Details |
|------|---------|
| **OVapi** | `https://v0.ovapi.nl/` - Gratis, realtime |
| **NDOV Loket** | [ndovloket.nl](https://ndovloket.nl/) - Officieel, registratie vereist |
| **OpenOV** | [openov.nl](https://openov.nl/) - Community |
| **9292 API** | [9292.nl/zakelijk](https://9292.nl/zakelijk/9292-vertrektijden-api/) - Commercieel |
| **NS API** | [ns.nl/en/travel-information/ns-api](https://www.ns.nl/en/travel-information/ns-api) - Treinen |

**OVapi endpoints:**

| Endpoint | Beschrijving |
|----------|--------------|
| `/stopareacode/{code}` | Info over halte |
| `/tpc/{timingpointcode}` | Vertrektijden |
| `/line/{lineplanningnumber}` | Lijn informatie |
| `/journey/{operatorcode}/{journeynumber}` | Specifieke rit |

**Voorbeeld:**
```
https://v0.ovapi.nl/stopareacode/Amsterdam
```

**Halte data beschikbaar:**
- Haltenaam
- Locatie (lat/lon)
- Type vervoer (bus, tram, metro, trein)
- Vervoerder
- Lijnen die stoppen

### 5d. Sport Faciliteiten

**OpenStreetMap tags:**

| Tag | Beschrijving |
|-----|--------------|
| `leisure=sports_centre` | Sportcentra/sporthallen |
| `leisure=swimming_pool` | Zwembaden |
| `leisure=fitness_centre` | Sportscholen |
| `leisure=pitch` | Sportvelden (voetbal, hockey, tennis, etc.) |
| `leisure=track` | Atletiekbanen |
| `sport=soccer` | Voetbalvelden |
| `sport=tennis` | Tennisbanen |
| `sport=*` | Alle sporten |

**CBS Nabijheidsstatistieken (85830NED):**
- Gemiddelde afstand tot sportterrein per buurt

### 5e. OpenStreetMap - Volledige Categorieën Overzicht

OpenStreetMap biedt een uitgebreid tagging systeem met 327+ amenity waarden, 200+ shop waarden en 50+ leisure waarden. Hieronder een overzicht van de belangrijkste categorieën voor buurtprofielen.

#### Amenity Tags (amenity=*)

**Onderwijs:**
- `amenity=school` - Scholen (basis en middelbaar)
- `amenity=kindergarten` - Kinderdagverblijven, peuterspeelzalen
- `amenity=college` - Hogescholen
- `amenity=university` - Universiteiten
- `amenity=library` - Bibliotheken
- `amenity=language_school` - Taalscholen
- `amenity=music_school` - Muziekscholen

**Voeding & Horeca:**
- `amenity=restaurant` - Restaurants
- `amenity=cafe` - Cafés
- `amenity=bar` - Bars
- `amenity=pub` - Kroegen
- `amenity=fast_food` - Fast food restaurants
- `amenity=ice_cream` - Ijssalons
- `amenity=food_court` - Food courts

**Gezondheidszorg:**
- `amenity=hospital` - Ziekenhuizen
- `amenity=clinic` - Klinieken
- `amenity=doctors` - Huisartsen
- `amenity=dentist` - Tandartsen
- `amenity=pharmacy` - Apotheken
- `amenity=veterinary` - Dierenartsen

**Publieke Diensten:**
- `amenity=police` - Politiebureaus
- `amenity=fire_station` - Brandweerkazernes
- `amenity=post_office` - Postkantoren
- `amenity=townhall` - Gemeentehuizen
- `amenity=courthouse` - Rechtbanken
- `amenity=community_centre` - Wijkcentra
- `amenity=social_facility` - Sociale voorzieningen

**Financieel:**
- `amenity=bank` - Banken
- `amenity=atm` - Geldautomaten
- `amenity=bureau_de_change` - Wisselkantoren

**Entertainment & Cultuur:**
- `amenity=theatre` - Theaters
- `amenity=cinema` - Bioscopen
- `amenity=arts_centre` - Kunstcentra
- `amenity=nightclub` - Nachtclubs

**Voorzieningen:**
- `amenity=toilets` - Openbare toiletten
- `amenity=drinking_water` - Drinkwaterpunten
- `amenity=bench` - Bankjes
- `amenity=shelter` - Schuilhutten
- `amenity=telephone` - Telefooncellen
- `amenity=post_box` - Brievenbussen
- `amenity=parking` - Parkeerplaatsen
- `amenity=bicycle_parking` - Fietsparkeren

**Afval:**
- `amenity=recycling` - Recyclepunten
- `amenity=waste_disposal` - Afvalcontainers

#### Shop Tags (shop=*)

**Dagelijkse boodschappen:**
- `shop=supermarket` - Supermarkten
- `shop=convenience` - Gemakswinkels
- `shop=bakery` - Bakkers
- `shop=butcher` - Slagers
- `shop=greengrocer` - Groenteboeren
- `shop=seafood` - Viswinkels
- `shop=alcohol` - Slijterijen

**Winkels:**
- `shop=clothes` - Kledingwinkels
- `shop=shoes` - Schoenenwinkels
- `shop=hairdresser` - Kappers
- `shop=beauty` - Schoonheidssalons
- `shop=bicycle` - Fietswinkels
- `shop=car_repair` - Autoreparatie
- `shop=electronics` - Elektronicawinkels
- `shop=furniture` - Meubelwinkels
- `shop=florist` - Bloemisten
- `shop=bookshop` - Boekhandels
- `shop=optician` - Opticiens
- `shop=chemist` - Drogisterijen
- `shop=hardware` - Bouwmarkten
- `shop=garden_centre` - Tuincentra
- `shop=pet` - Dierenwinkels
- `shop=toys` - Speelgoedwinkels

#### Leisure Tags (leisure=*)

**Sport & Recreatie:**
- `leisure=sports_centre` - Sportcentra/sporthallen (gebouwen)
- `leisure=pitch` - Sportvelden (buiten)
- `leisure=swimming_pool` - Zwembaden
- `leisure=fitness_centre` - Fitnesscentra
- `leisure=stadium` - Stadions
- `leisure=track` - Atletiekbanen
- `leisure=golf_course` - Golfbanen
- `leisure=ice_rink` - IJsbanen

**Groen & Natuur:**
- `leisure=park` - Parken
- `leisure=playground` - Speeltuinen
- `leisure=garden` - Tuinen
- `leisure=nature_reserve` - Natuurreservaten
- `leisure=dog_park` - Hondenspeelplaatsen

**Overig:**
- `leisure=marina` - Jachthavens
- `leisure=fishing` - Visplaatsen
- `leisure=picnic_table` - Picknicktafels

#### Tourism Tags (tourism=*)

- `tourism=hotel` - Hotels
- `tourism=motel` - Motels
- `tourism=hostel` - Hostels
- `tourism=guest_house` - Pensions
- `tourism=museum` - Museums
- `tourism=attraction` - Attracties
- `tourism=viewpoint` - Uitzichtpunten
- `tourism=information` - Informatiepunten
- `tourism=picnic_site` - Picknickplaatsen
- `tourism=camp_site` - Campings

#### Healthcare Tags (healthcare=*)

- `healthcare=hospital` - Ziekenhuizen
- `healthcare=clinic` - Klinieken
- `healthcare=dentist` - Tandartsen
- `healthcare=physiotherapist` - Fysiotherapeuten
- `healthcare=midwife` - Verloskundigen
- `healthcare=occupational_therapist` - Ergotherapeuten

#### Office Tags (office=*)

- `office=government` - Overheidskantoren
- `office=lawyer` - Advocatenkantoren
- `office=accountant` - Accountantskantoren
- `office=insurance` - Verzekeringskantoren
- `office=it` - IT-bedrijven
- `office=estate_agent` - Makelaars

#### Overpass API Query Voorbeelden

**Alle voorzieningen in een gebied:**
```
[out:json][timeout:25];
(
  node["amenity"="school"](bbox);
  way["amenity"="school"](bbox);
  relation["amenity"="school"](bbox);

  node["shop"="supermarket"](bbox);
  way["shop"="supermarket"](bbox);
  relation["shop"="supermarket"](bbox);

  node["leisure"="park"](bbox);
  way["leisure"="park"](bbox);
  relation["leisure"="park"](bbox);
);
out center;
```

**Tips voor gebruik:**
- Gebruik `node`, `way`, en `relation` voor complete dekking
- `out center;` geeft centerpunt voor ways/relations
- Combineer meerdere queries in één API call voor betere performance
- Filter op naam met `["name"~"tekst"]` voor specifieke zoekacties

**Bronnen:**
- [OpenStreetMap Key:amenity](https://wiki.openstreetmap.org/wiki/Key:amenity) - 327+ waarden
- [OpenStreetMap Map Features](https://wiki.openstreetmap.org/wiki/Map_features) - Volledig overzicht
- [OpenStreetMap Key:leisure](https://wiki.openstreetmap.org/wiki/Key:leisure) - 50+ waarden
- [OpenStreetMap Key:tourism](https://wiki.openstreetmap.org/wiki/Key:tourism) - Toeristische voorzieningen
- [Overpass API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API) - Query syntax

---

## 6. Zorg & Welzijn

### 6a. Huisartsen, Ziekenhuizen, Apotheken

**Vektis AGB-register:**

| Aspect | Details |
|--------|---------|
| **Databron** | Vektis |
| **Website** | [vektis.nl/agb-register](https://www.vektis.nl/agb-register) |
| **Gratis/Open** | **Beperkt** - Raadplegen individueel gratis, bulk vereist abonnement |

**Beschikbare data:**
- Vestigingsadressen zorgaanbieders
- Kwalificaties en erkenningen
- AGB-codes (unieke identificatie)

**OpenStreetMap alternatief (gratis):**

| Tag | Beschrijving |
|-----|--------------|
| `amenity=pharmacy` | Apotheken |
| `amenity=doctors` | Huisartsen |
| `amenity=hospital` | Ziekenhuizen |
| `amenity=clinic` | Klinieken |
| `amenity=dentist` | Tandartsen |
| `healthcare=*` | Alle zorgvoorzieningen |

**CBS Nabijheidsstatistieken (85830NED):**
- Gemiddelde afstand tot huisartsenpraktijk
- Gemiddelde afstand tot ziekenhuis
- Gemiddelde afstand tot apotheek

### 6b. Zorginstellingen

**RIVM Zorgatlas:**

| Aspect | Details |
|--------|---------|
| **Website** | [zorgatlas.nl](https://www.zorgatlas.nl/) |
| **Beschikbaar** | Kaarten en data over zorggebruik |

**Zorgkaart Nederland:**
- [zorgkaartnederland.nl](https://www.zorgkaartnederland.nl/)
- Reviews en locaties van zorgaanbieders

### 6c. GGZ Data

| Bron | Details |
|------|---------|
| **Vektis Open Data** | [vektis.nl/open-data](https://www.vektis.nl/open-data) |
| **Regiobeeld** | [regiobeeld.nl](https://www.regiobeeld.nl/zorggebruik/geestelijke-gezondheidszorg) |
| **GGZ Dataportaal** | [ggzdataportaal.nl](https://ggzdataportaal.nl/) |

**Beschikbare data:**
- Zorgkosten GGZ per postcode3 en gemeente
- Aantal patiënten per gemeente
- Kwaliteitsgegevens

**Opmerking:** Gedetailleerde data vaak alleen op gemeente- of regioniveau, niet op buurtniveau.

---

## 7. Werk & Inkomen

### CBS Uitkeringen per Wijk en Buurt

| Aspect | Details |
|--------|---------|
| **Databron** | CBS |
| **Datasets** | 85586NED (2023), 84692NED (2019), 80794ned (historisch) |
| **API Endpoint** | `https://datasets.cbs.nl/odata/v1/CBS/{tabelID}` |
| **Gratis/Open** | Ja |

**Beschikbare uitkeringstypen en velden:**

| Veld | Beschrijving |
|------|--------------|
| `PersonenMetEenBijstandsuitkering_1` | Bijstandsuitkeringen (Participatiewet) |
| `PersonenMetEenAOUitkeringTotaal_2` | AO-uitkeringen totaal (WAO/WIA/Wajong) |
| `PersonenMetEenWWUitkering_6` | WW-uitkeringen |
| `PersonenMetEenAOWUitkering_7` | AOW-uitkeringen |

**Voorbeeld API call:**
```
https://datasets.cbs.nl/odata/v1/CBS/85586NED/Observations?$filter=WijkenEnBuurten eq 'BU03630000'
```

### Inkomen en Vermogen

**Onderdeel van CBS Kerncijfers Wijken en Buurten (85984NED):**

| Veld | Beschrijving |
|------|--------------|
| `GemiddeldInkomenPerInkomensontvanger_5` | Gemiddeld inkomen |
| `k_40PercentPersHuishLaagsteInk_59` | % huishoudens laagste 40% inkomen |
| `k_20PercentPersHuishHoogsteInkomen_60` | % huishoudens hoogste 20% inkomen |

### Werkloosheid

**CBS Arbeidsdeelname datasets:**

| Dataset | Beschrijving |
|---------|--------------|
| **85542NED** | Arbeidsdeelname; regionale indeling |
| **85014NED** | Arbeidsmarkt regio |

---

## 8. Leefomgeving

### 8a. Groenvoorziening / Parken - CBS Nabijheidsstatistieken

| Aspect | Details |
|--------|---------|
| **Databron** | CBS |
| **Dataset** | 85830NED (2023), 85560NED (2022), 85039NED (2021) |
| **API Endpoint** | `https://datasets.cbs.nl/odata/v1/CBS/85830NED` |
| **Gratis/Open** | Ja |

**Beschikbare afstandsgegevens:**

| Veld | Beschrijving |
|------|--------------|
| `AfstandTotGrteGroeneGeb_101` | Afstand tot groot groen gebied (>25 ha) |
| `AfstandTotOpenbaarGroen_98` | Afstand tot openbaar groen |
| `Oppervlakte_102` | Oppervlakte groen in omgeving |

**Voorbeeld API call:**
```
https://datasets.cbs.nl/odata/v1/CBS/85830NED/Observations?$filter=WijkenEnBuurten eq 'BU03630000'
```

### 8b. Luchtkwaliteit - RIVM

| Aspect | Details |
|--------|---------|
| **Databron** | RIVM Landelijk Meetnet Luchtkwaliteit |
| **API Endpoint** | `https://api.luchtmeetnet.nl/open_api/` |
| **Documentatie** | [api-docs.luchtmeetnet.nl](https://api-docs.luchtmeetnet.nl/) |
| **Website** | [luchtmeetnet.nl](https://www.luchtmeetnet.nl/) |
| **Gratis/Open** | Ja |

**Beschikbare componenten:**

| Component | Beschrijving |
|-----------|--------------|
| `PM10` | Fijnstof (grof) |
| `PM25` | Fijnstof (fijn) |
| `NO2` | Stikstofdioxide |
| `NO` | Stikstofmonoxide |
| `O3` | Ozon |
| `SO2` | Zwaveldioxide |
| `CO` | Koolstofmonoxide |
| `NH3` | Ammoniak |

**API endpoints:**

| Endpoint | Beschrijving |
|----------|--------------|
| `/stations` | Lijst van meetstations |
| `/stations/{station_number}` | Details van station |
| `/measurements` | Meetwaarden |
| `/lki` | Luchtkwaliteitsindex |

**Voorbeeld:**
```
https://api.luchtmeetnet.nl/open_api/stations?page=1
https://api.luchtmeetnet.nl/open_api/measurements?station_number=NL10636&page=1
```

**Opmerking:** Meetstations zijn beperkt in aantal. Voor gebiedsdekkende data zijn modelberekeningen nodig (niet via API beschikbaar).

### 8c. Geluidsoverlast - Atlas Leefomgeving

| Aspect | Details |
|--------|---------|
| **Databron** | Atlas Leefomgeving / RIVM |
| **Portal** | [atlasleefomgeving.nl](https://www.atlasleefomgeving.nl/) |
| **Data RIVM** | [data.rivm.nl](https://data.rivm.nl/) |
| **Gratis/Open** | Ja (kaartlagen), beperkt (API) |

**Beschikbare geluidsdata:**
- Cumulatieve geluidkaart (10m resolutie)
- Geluid van wegverkeer
- Geluid van treinverkeer
- Geluid van vliegtuigen
- Geluid van industrie
- Geluid van windturbines

**Opmerking:** Data is primair beschikbaar als WMS/WFS kaartlagen, niet als API met waarden per buurt. Voor buurtgemiddelden zou je de kaartdata moeten analyseren.

### 8d. Afstand tot Voorzieningen - CBS Nabijheidsstatistieken

**Dataset 85830NED bevat afstanden tot:**

| Voorziening | Veldprefix |
|-------------|------------|
| Huisartsenpraktijk | `AfstandTotHuisartsenpraktijk` |
| Ziekenhuis | `AfstandTotZiekenhuis` |
| Apotheek | `AfstandTotApotheek` |
| Kinderdagverblijf | `AfstandTotKinderdagverblijf` |
| Basisschool | `AfstandTotBasisschool` |
| School voor VO | `AfstandTotSchoolVoortgezetOnderwijs` |
| Bibliotheek | `AfstandTotBibliotheek` |
| Zwembad | `AfstandTotZwembad` |
| Sportterrein | `AfstandTotSportterrein` |
| Supermarkt | `AfstandTotSupermarkt` |
| Warenhuis | `AfstandTotWarenhuis` |
| Café | `AfstandTotCafe` |
| Restaurant | `AfstandTotRestaurant` |
| Hotel | `AfstandTotHotel` |
| OV-halte | `AfstandTotBelangrijkOverstapstation` |
| Treinstation | `AfstandTotTreinstation` |
| Oprit hoofdverkeersweg | `AfstandTotOpritHoofdverkeersweg` |

---

## 9. Trends / Historische Data

### 9a. Bevolkingsontwikkeling - CBS

| Aspect | Details |
|--------|---------|
| **Databron** | CBS Kerncijfers Wijken en Buurten |
| **Historische reeks** | 1995, 1997, 1999, 2001, jaarlijks vanaf 2003 |

**Beschikbare dataset ID's per jaar:**

| Jaar | Dataset ID |
|------|------------|
| 2025 | 86165NED |
| 2024 | 85984NED |
| 2023 | 85618NED |
| 2022 | 85318NED |
| 2021 | 85039NED |
| 2020 | 84799NED |
| 2019 | 84583NED |
| 2018 | 84286NED |
| 2017 | 83765NED |
| 2016 | 83487NED |
| 2015 | 83220NED |

**Downloads overzicht:**
[CBS Kerncijfers 2004-2025](https://www.cbs.nl/nl-nl/reeksen/publicatie/kerncijfers-wijken-en-buurten)

**Let op:** Gebiedsindelingen kunnen per jaar wijzigen (gemeentelijke herindelingen, buurtgrenzen), waardoor vergelijking niet altijd 1-op-1 mogelijk is.

### 9b. Criminaliteitstrends

Via **Politie Open Data / CBS 47018NED** zijn jaarcijfers vanaf 2015 beschikbaar.

**Filtering op jaar:**
```
$filter=Perioden eq '2023JJ00' and WijkenEnBuurten eq 'BU03630000'
```

**Periode codes:**
- `2023JJ00` = Jaar 2023
- `2022JJ00` = Jaar 2022
- etc.

### 9c. Huizenprijzen Ontwikkeling

| Aspect | Details |
|--------|---------|
| **Databron** | CBS / Kadaster |
| **Datasets** | 85773NED (index), 85792NED (per m2) |
| **Historisch** | Prijsindex vanaf Q1 1995 |

**API Endpoints:**
```
https://opendata.cbs.nl/ODataApi/odata/85773NED
https://opendata.cbs.nl/ODataApi/odata/85792NED
```

**Beschikbare data:**
- Prijsindex bestaande koopwoningen
- Gemiddelde verkoopprijs per m2
- Per gemeente, niet per buurt

**Maatwerkpublicatie per gemeente:**
[CBS PBK naar gemeente](https://www.cbs.nl/nl-nl/maatwerk/2025/23/prijsindex-bestaande-koopwoningen--pbk---naar-gemeente)

---

## 10. Geografische Grenzen en Kaarten

### PDOK CBS Wijken en Buurten

| Aspect | Details |
|--------|---------|
| **Databron** | PDOK |
| **API Endpoint** | `https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1` |
| **WFS** | `https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0` |
| **Documentatie** | [PDOK CBS Wijken en Buurten](https://www.pdok.nl/ogc-apis/-/article/cbs-wijken-en-buurten) |
| **Gratis/Open** | Ja |

**Beschikbare collections:**
- `buurten` - Alle buurten met geometrie
- `wijken` - Alle wijken met geometrie
- `gemeenten` - Alle gemeenten met geometrie

**Voorbeeld API calls:**
```
# Alle buurten in gemeente Amsterdam
https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1/collections/buurten/items?filter=gemeentecode='GM0363'

# Specifieke buurt op code
https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1/collections/buurten/items?filter=buurtcode='BU03630000'
```

### PDOK BAG (Basisregistratie Adressen en Gebouwen)

| Aspect | Details |
|--------|---------|
| **Databron** | PDOK / Kadaster |
| **OGC API Endpoint** | `https://api.pdok.nl/lv/bag/ogc/v1` |
| **Gratis/Open** | Ja (CC0 1.0) |
| **Updates** | Dagelijks |

**Beschikbare collections:**

| Collection | Beschrijving |
|------------|--------------|
| `panden` | Gebouwen met geometrie en bouwjaar |
| `verblijfsobjecten` | Adressen met gebruiksdoel |
| `ligplaatsen` | Woonboten |
| `standplaatsen` | Woonwagens |
| `nummeraanduidingen` | Huisnummers |
| `woonplaatsen` | Woonplaatsen |

**Voorbeeld:**
```
https://api.pdok.nl/lv/bag/ogc/v1/collections/panden/items?bbox=4.89,52.37,4.90,52.38
```

---

## Samenvatting API Endpoints

| Categorie | API | Base URL | Auth |
|-----------|-----|----------|------|
| **CBS OData v4** | Alle CBS data | `https://datasets.cbs.nl/odata/v1/CBS/` | Geen |
| **CBS OData v3** | Legacy CBS | `https://opendata.cbs.nl/ODataApi/odata/` | Geen |
| **Politie/CBS** | Criminaliteit | `https://opendata.cbs.nl/ODataApi/odata/47018NED/` | Geen |
| **PDOK BAG** | Gebouwen/Adressen | `https://api.pdok.nl/lv/bag/ogc/v1` | Geen |
| **PDOK Wijken** | Geo grenzen | `https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1` | Geen |
| **DUO** | Scholen | `https://duo.nl/open_onderwijsdata/` | Geen |
| **RIVM Lucht** | Luchtkwaliteit | `https://api.luchtmeetnet.nl/open_api/` | Geen |
| **OpenStreetMap** | POI's | `https://overpass-api.de/api/interpreter` | Geen |
| **OVapi** | OV haltes | `https://v0.ovapi.nl/` | Geen |
| **NS** | Treinen | `https://gateway.apiportal.ns.nl/` | API key |

---

## CBS Gebiedscodes

Voor het filteren op geografisch niveau gebruikt CBS de volgende code-prefixen:

| Prefix | Niveau | Voorbeeld | Beschrijving |
|--------|--------|-----------|--------------|
| `NL` | Nederland | NL00 | Heel Nederland |
| `LD` | Landsdeel | LD01 | Noord-Nederland |
| `PV` | Provincie | PV20 | Groningen |
| `CR` | COROP | CR01 | Oost-Groningen |
| `GM` | Gemeente | GM0363 | Amsterdam |
| `WK` | Wijk | WK036314 | Wijk in Amsterdam |
| `BU` | Buurt | BU03631401 | Buurt in Amsterdam |

**Code opbouw:**
- Gemeente: `GM` + 4 cijfers
- Wijk: `WK` + gemeentecode (4) + wijknummer (2) = 8 cijfers
- Buurt: `BU` + gemeentecode (4) + wijknummer (2) + buurtnummer (2) = 10 cijfers

---

## Implementatie Prioriteit voor Dashboard

### Fase 1: Quick Wins (bestaande CBS data uitbreiden)

| Item | Bron | Actie |
|------|------|-------|
| Woningtypes | CBS 85984NED | Extra velden ophalen |
| Criminaliteit detail | CBS 47018NED | Hardcoded waarden vervangen |
| Veiligheidsscore | Berekening | Score berekenen uit data |

### Fase 2: CBS Nabijheidsstatistieken

| Item | Bron | Actie |
|------|------|-------|
| Afstanden voorzieningen | CBS 85830NED | Nieuwe API call |
| Groenvoorziening | CBS 85830NED | Nieuwe API call |

### Fase 3: Externe API's

| Item | Bron | Actie |
|------|------|-------|
| Scholen | DUO | CSV downloaden of API |
| Luchtkwaliteit | RIVM | API implementeren |
| OV haltes | OVapi | API implementeren |
| Winkels/Horeca | OpenStreetMap | Overpass queries |

### Fase 4: Historische data

| Item | Bron | Actie |
|------|------|-------|
| Bevolkingstrends | CBS per jaar | Meerdere jaren ophalen |
| Criminaliteitstrends | CBS 47018NED | Meerdere jaren ophalen |

### Fase 5: Complexere integraties

| Item | Bron | Actie |
|------|------|-------|
| Verhuisbewegingen | CBS CSV | Downloaden en verwerken |
| Huizenprijzen | CBS/Kadaster | Per gemeente |
| Woningcorporaties | Handmatig/scraping | Alternatief zoeken |

---

## Bronnen en Referenties

- [CBS Open Data Portaal](https://opendata.cbs.nl/)
- [CBS Snelstartgids OData v4](https://www.cbs.nl/nl-nl/onze-diensten/open-data/statline-als-open-data/snelstartgids-odata-v4)
- [PDOK](https://www.pdok.nl/)
- [DUO Open Onderwijsdata](https://duo.nl/open_onderwijsdata/)
- [Politie Open Data](https://data.politie.nl/)
- [RIVM Data](https://data.rivm.nl/)
- [Luchtmeetnet API](https://api-docs.luchtmeetnet.nl/)
- [Atlas Leefomgeving](https://www.atlasleefomgeving.nl/)
- [Vektis Open Data](https://www.vektis.nl/open-data)
- [OpenStreetMap Wiki](https://wiki.openstreetmap.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OpenOV](https://openov.nl/)
- [Data.overheid.nl](https://data.overheid.nl/)
