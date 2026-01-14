# Leefbaarheid Score Implementatie

## Overzicht

De leefbaarheidsscore in het Buurtprofiel dashboard is gebaseerd op de **Leefbaarometer 3.0** methodiek. Deze score geeft een gewogen indicatie van de leefbaarheid van een buurt, wijk of gemeente op basis van 5 dimensies.

## Methodiek

### Score Berekening

De totale leefbaarheidsscore wordt berekend als een gewogen gemiddelde van 5 dimensies:

1. **Veiligheid & Overlast** (35% gewicht)
2. **Voorzieningen** (35% gewicht)
3. **Woningvoorraad** (15% gewicht)
4. **Sociale Cohesie** (10% gewicht)
5. **Fysieke Omgeving** (5% gewicht)

### Z-score Normalisatie

Elke dimensie wordt genormaliseerd met behulp van **Z-score transformatie**:

```
Z-score = (waarde - gemiddelde) / standaarddeviatie
```

De Z-score wordt vervolgens omgezet naar een schaal van 0-100:
- Z-score van -2 of lager = 0 punten
- Z-score van 0 = 50 punten (gemiddeld)
- Z-score van +2 of hoger = 100 punten

### Classificatie

De scores worden geclassificeerd als volgt:

- **80-100**: Uitstekend
- **60-79**: Goed
- **40-59**: Voldoende
- **20-39**: Matig
- **0-19**: Onvoldoende

## Dimensies

### 1. Veiligheid & Overlast (35%)

**Indicatoren:**
- Totaal aantal misdrijven per 1000 inwoners (negatief)
- Geweldsdelicten per 1000 inwoners (negatief)
- Vermogensdelicten per 1000 inwoners (negatief)
- Vandalisme & vernielingen per 1000 inwoners (negatief)
- Overlast (drugs, burengerucht) per 1000 inwoners (negatief)

**Berekening:**
```typescript
const totaalPer1000 = (data.criminaliteit.totaal / bevolking) * 1000;
const geweldPer1000 = (data.criminaliteit.geweld / bevolking) * 1000;
const vermogenPer1000 = (data.criminaliteit.vermogen / bevolking) * 1000;
const vernielingPer1000 = (data.criminaliteit.vernieling / bevolking) * 1000;
const overlastPer1000 = ((drugsOverlast + burengerucht) / bevolking) * 1000;

// Gemiddelde van negatieve indicatoren (laagste criminaliteit = hoogste score)
const gemiddeldeCriminaliteit = (totaalPer1000 + geweldPer1000 +
                                  vermogenPer1000 + vernielingPer1000 +
                                  overlastPer1000) / 5;

// Inversie: hoe lager de criminaliteit, hoe hoger de score
const zScore = zScoreInverse(gemiddeldeCriminaliteit, 45, 15);
const score = normalize(zScore);
```

**Referentiewaarden:**
- Gemiddelde: 45 misdrijven per 1000 inwoners
- Standaarddeviatie: 15

### 2. Voorzieningen (35%)

**Indicatoren:**
- Aantal voorzieningen per 1000 inwoners (positief)

**Categorieën voorzieningen:**
- Basisscholen
- Middelbare scholen
- Kinderdagverblijven
- Supermarkten
- Huisartsen
- Religieuze centra
- Sportverenigingen
- Speelterreinen
- Wijkcentra

**Berekening:**
```typescript
const voorzieningenPer1000 = (aantalVoorzieningen / bevolking) * 1000;
const zScore = zScoreNormal(voorzieningenPer1000, 8, 4);
const score = normalize(zScore);
```

**Referentiewaarden:**
- Gemiddelde: 8 voorzieningen per 1000 inwoners
- Standaarddeviatie: 4

**Data bron:**
- OpenStreetMap via Overpass API
- Cached per gebied (30 minuten)
- Geladen bij selectie van gebied

### 3. Woningvoorraad (15%)

**Indicatoren:**
- Percentage koopwoningen (positief)
- Percentage sociale huur (licht negatief)
- Percentage vrijstaande woningen (positief)

**Berekening:**
```typescript
const eigendomScore = data.woningen.koopPercentage -
                      (data.woningen.huurSociaalPercentage * 0.5);
const typeScore = data.woningen.vrijstaandPercentage +
                  data.woningen.tweeOnderEenKapPercentage +
                  (data.woningen.hoekwoningPercentage * 0.5);

const gemiddeldeWoning = (eigendomScore + typeScore) / 2;
const zScore = zScoreNormal(gemiddeldeWoning, 40, 15);
const score = normalize(zScore);
```

**Referentiewaarden:**
- Gemiddelde: 40%
- Standaarddeviatie: 15

### 4. Sociale Cohesie (10%)

**Indicatoren:**
- Percentage eenpersoonshuishoudens (negatief)
- Percentage huishoudens met kinderen (positief)
- Gemiddelde huishoudensgrootte (positief)

**Berekening:**
```typescript
const eenpersoonsPerc = (data.huishoudens.eenpersoons / totaalHuishoudens) * 100;
const metKinderenPerc = (data.huishoudens.metKinderen / totaalHuishoudens) * 100;
const huishoudensGrootte = data.huishoudens.gemiddeldeGrootte;

const cohesieScore = metKinderenPerc - (eenpersoonsPerc * 0.3) +
                     (huishoudensGrootte * 15);

const zScore = zScoreNormal(cohesieScore, 35, 12);
const score = normalize(zScore);
```

**Referentiewaarden:**
- Gemiddelde: 35
- Standaarddeviatie: 12

### 5. Fysieke Omgeving (5%)

**Status:** NOG NIET GEMETEN

Deze dimensie is momenteel nog niet geïmplementeerd omdat we geen data hebben over:
- Groenvoorzieningen
- Luchtkwaliteit
- Geluidsoverlast
- Vervuiling

**Toekomstige implementatie:**
- OpenStreetMap data voor parken en groenvoorzieningen
- RIVM data voor luchtkwaliteit
- CBS data voor geluidsbelasting

## Implementatie Details

### Bestandsstructuur

```
dashboard/
├── src/
│   ├── utils/
│   │   └── leefbaarheid.ts          # Hoofdberekening
│   ├── components/
│   │   └── tabs/
│   │       └── ruwe-data/
│   │           └── Overzicht.tsx     # UI weergave
│   ├── services/
│   │   ├── overpass.ts              # Voorzieningen API
│   │   └── pdok.ts                  # Geometrie data
│   ├── store/
│   │   └── gebiedStore.ts           # Cache management
│   └── types/
│       └── gebied.ts                # Type definities
```

### Belangrijke Functies

#### `berekenLeefbaarheidScore()`
Hoofdfunctie in `leefbaarheid.ts` die alle dimensies berekent en combineert.

```typescript
export function berekenLeefbaarheidScore(
  data: GebiedData,
  aantalVoorzieningen?: number
): LeefbaarheidScore
```

#### `zScoreNormal()` en `zScoreInverse()`
Hulpfuncties voor Z-score normalisatie:
- `zScoreNormal`: Hogere waarde = betere score
- `zScoreInverse`: Lagere waarde = betere score (voor criminaliteit)

#### `normalize()`
Converteert Z-score naar 0-100 schaal.

### Data Flow

1. **Gebied Selectie** (GebiedSearch.tsx)
   ```
   Gebruiker selecteert gebied
   → fetchCBSData() laadt basis statistieken
   → fetchVoorzieningen() laadt voorzieningen (asynchroon)
   → Data opgeslagen in gebiedStore
   ```

2. **Score Berekening** (Overzicht.tsx)
   ```
   gebiedData beschikbaar
   → berekenLeefbaarheidScore()
   → Dimensies weergegeven met scores
   ```

3. **Cache Management** (gebiedStore.ts)
   ```
   Voorzieningen cache per gebied
   → 30 minuten TTL
   → Key format: {gebiedCode}_v2
   ```

## UI Componenten

### LeefbaarheidScoreCard

Toont de totale leefbaarheidsscore met:
- Grote score (0-100)
- Classificatie (Uitstekend, Goed, etc.)
- Info icoon met methodiek uitleg
- Link naar leefbaarometer.nl

### DimensieAccordion

Inklapbare dimensie cards die tonen:
- Dimensie naam en emoji
- Score (0-100)
- Classificatie
- Gewicht in totaalscore
- Info icoon met berekeningswijze
- Detail indicatoren (bij uitklappen)

## Problemen en Oplossingen

### 1. Voorzieningen Laden

**Probleem:** Voorzieningen werden niet geladen bij gebied selectie.

**Oplossing:**
- Voorzieningen laden asynchroon in GebiedSearch.tsx
- Opslaan in voorzieningenCache met `_v2` suffix
- `aantalVoorzieningen` toegevoegd aan GebiedData interface
- Voorzieningen component reageert op cache updates

### 2. App Crashes

**Probleem:** App crashte met "Cannot read properties of undefined (reading 'totaal')".

**Oplossing:**
- Null check toegevoegd: `if (!gebiedData || !gebiedData.bevolking)`
- Foutmelding tonen in plaats van crash

### 3. Tooltip Overlapping

**Probleem:** Info icoon tooltips vielen buiten containers en overlapten.

**Oplossing:**
- Rechts-uitgelijnde tooltips met `right: '-8px'`
- Dynamische z-index (9998/9999 when open)
- Compacte width (240-260px)

## Data Bronnen

### CBS (Centraal Bureau voor de Statistiek)
- Bevolkingsstatistieken
- Huishoudenssamenstelling
- Woningvoorraad
- Criminaliteitscijfers
- Inkomensgegevens

### OpenStreetMap (Overpass API)
- Locaties voorzieningen
- Type voorzieningen
- Real-time data

### PDOK (Publieke Dienstverlening Op de Kaart)
- Gebiedsgeometrie
- Bounding boxes voor voorzieningen queries

## Toekomstige Verbeteringen

1. **Fysieke Omgeving Dimensie**
   - Implementeer data bronnen voor groen, luchtkwaliteit, geluid
   - Voeg toe aan totaalscore berekening

2. **Historische Trends**
   - Toon leefbaarheidsscore over meerdere jaren
   - Vergelijk ontwikkeling tussen gebieden

3. **Vergelijkingen**
   - Toon leefbaarheidsscore van omliggende gebieden
   - Benchmark tegen gemeentegemiddelde

4. **Personalisatie**
   - Laat gebruikers eigen gewichten instellen per dimensie
   - Bereken persoonlijke leefbaarheidsscore

5. **Performantie**
   - Pre-cache voorzieningen voor populaire gebieden
   - Lazy loading van dimensie details

## Referenties

- [Leefbaarometer 3.0 Methodiek](https://www.leefbaarometer.nl/)
- [CBS StatLine](https://opendata.cbs.nl/)
- [OpenStreetMap Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Z-score Normalisatie](https://en.wikipedia.org/wiki/Standard_score)

---

**Laatste update:** 9 januari 2026
**Versie:** 1.0
