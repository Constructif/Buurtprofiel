# Implementatieplan: Zorg & Welzijn Tabblad - Buurtprofiel Dashboard

## 1. Overzicht

Dit document beschrijft de technische implementatie van het "Zorg & Welzijn" tabblad voor het Buurtprofiel dashboard van Constructif. Het tabblad toont gegevens over eenzaamheid, mentale gezondheid, mantelzorg, jeugdzorg en WMO op buurt-, wijk- en gemeenteniveau.

---

## 2. Databronnen

### 2.1 RIVM Gezondheidsmonitor (Dataset 50120NED)

**Beschrijving:** Geschatte percentages over gezondheid, welzijn en leefstijl op buurt-, wijk- en gemeenteniveau, gebaseerd op de Gezondheidsmonitor Volwassenen en Ouderen van GGD'en, CBS en RIVM.

**Base URL:** 
```
https://dataderden.cbs.nl/ODataApi/OData/50120NED
```

**Belangrijke endpoints:**
| Endpoint | Beschrijving |
|----------|--------------|
| `/TypedDataSet` | De feitelijke data met numerieke waarden |
| `/DataProperties` | Metadata over alle beschikbare velden |
| `/WijkenEnBuurten` | Lijst van alle regiocodes met namen |
| `/Perioden` | Beschikbare jaren (2012, 2016, 2020, 2022) |
| `/Leeftijd` | Leeftijdscategorieën |
| `/Marges` | Waarde vs betrouwbaarheidsintervallen |

**Beschikbare perioden:**
| Key | Titel |
|-----|-------|
| `2012JJ00` | 2012 |
| `2016JJ00` | 2016 |
| `2020JJ00` | 2020 |
| `2022JJ00` | 2022 |

**Beschikbare leeftijdscategorieën:**
| Key | Titel |
|-----|-------|
| `20300` | 18 jaar of ouder |
| `53115` | 18 tot 65 jaar |
| `80200` | 65 jaar of ouder |

**Beschikbare marges:**
| Key | Titel |
|-----|-------|
| `MW00000` | Waarde (gebruik deze!) |
| `MOG0095` | Ondergrens 95%-interval |
| `MBG0095` | Bovengrens 95%-interval |

---

### 2.2 CBS Kerncijfers Wijken en Buurten 2024 (Dataset 85984NED)

**Beschrijving:** Kerncijfers over alle wijken en buurten in Nederland, inclusief jeugdzorg en WMO-gegevens.

**Base URL:**
```
https://opendata.cbs.nl/ODataApi/OData/85984NED
```

**Belangrijke endpoints:**
| Endpoint | Beschrijving |
|----------|--------------|
| `/TypedDataSet` | De feitelijke data |
| `/DataProperties` | Metadata over alle velden |
| `/WijkenEnBuurten` | Lijst van alle regiocodes |

---

## 3. Te Implementeren Indicatoren

### 3.1 Uit RIVM Gezondheidsmonitor (50120NED)

#### Eenzaamheid
| Indicator | Veldnaam | Beschrijving |
|-----------|----------|--------------|
| Eenzaam (totaal) | `Eenzaam_27` | % personen 18+ dat zich eenzaam voelt (score 3+) |
| Ernstig/zeer ernstig eenzaam | `ErnstigZeerErnstigEenzaam_28` | % personen 18+ ernstig eenzaam (score 9+) |
| Emotioneel eenzaam | `EmotioneelEenzaam_29` | % personen 18+ emotioneel eenzaam |
| Sociaal eenzaam | `SociaalEenzaam_30` | % personen 18+ sociaal eenzaam (vanaf 2016) |

#### Mentale Gezondheid
| Indicator | Veldnaam | Beschrijving |
|-----------|----------|--------------|
| Hoog risico angst/depressie | `HoogRisicoOpAngstOfDepressie_25` | % personen 18+ met hoog risico (Kessler-10 score 30-50) |
| Psychische klachten | `PsychischeKlachten_20` | % personen 18+ met psychische klachten (MHI-5 ≤60) - alleen 2022 |
| (Heel) veel stress | `HeelVeelStressInAfgelopen4Weken_26` | % personen 18+ met veel stress afgelopen 4 weken - vanaf 2020 |
| Mist emotionele steun | `MistEmotioneleSteun_23` | % personen 18+ dat emotionele steun mist - alleen 2022 |
| (Zeer) lage veerkracht | `ZeerLageVeerkracht_21` | % personen 18+ met lage veerkracht - alleen 2022 |

#### Zorg & Ondersteuning
| Indicator | Veldnaam | Beschrijving |
|-----------|----------|--------------|
| Mantelzorger | `Mantelzorger_31` | % personen 18+ dat mantelzorg geeft (≥3 mnd of ≥8 uur/week) - vanaf 2016 |
| Vrijwilligerswerk | `Vrijwilligerswerk_32` | % personen 18+ dat vrijwilligerswerk doet - vanaf 2016 |

#### Algemene Gezondheid
| Indicator | Veldnaam | Beschrijving |
|-----------|----------|--------------|
| Ervaren gezondheid goed/zeer goed | `ErvarenGezondheidGoedZeerGoed_4` | % personen 18+ met goede/zeer goede gezondheid |
| Langdurige aandoeningen | `EenOfMeerLangdurigeAandoeningen_16` | % personen 18+ met langdurige ziekte - vanaf 2016 |
| Beperkt vanwege gezondheid | `BeperktVanwegeGezondheid_17` | % personen 18+ (ernstig) beperkt - vanaf 2020 |
| Moeite met rondkomen | `MoeiteMetRondkomen_33` | % personen 18+ met moeite met rondkomen |

### 3.2 Uit CBS Kerncijfers (85984NED)

#### Jeugdzorg
| Indicator | Veldnaam (verwacht) | Beschrijving |
|-----------|---------------------|--------------|
| Jongeren met jeugdzorg | `JongerenMetJeugdzorg_*` | Aantal/% jongeren tot 23 jaar met jeugdzorg |
| Jeugdhulp zonder verblijf | `JeugdhulpZonderVerblijf_*` | Aantal jongeren met ambulante jeugdhulp |
| Jeugdhulp met verblijf | `JeugdhulpMetVerblijf_*` | Aantal jongeren met residentiële jeugdhulp |
| Jeugdbescherming | `Jeugdbescherming_*` | Aantal jongeren onder kinderbescherming |

#### WMO
| Indicator | Veldnaam (verwacht) | Beschrijving |
|-----------|---------------------|--------------|
| WMO-cliënten totaal | `PersonenMetWmoMaatwerkarrangement_*` | Aantal personen met WMO-voorziening |

**Let op:** De exacte veldnamen voor Jeugdzorg en WMO in 85984NED moeten worden geverifieerd door de DataProperties endpoint te bevragen. De structuur kan per jaar wijzigen.

---

## 4. API Query Structuur

### 4.1 OData v3 Filter Syntax (gebruikt door beide datasets)

De CBS/RIVM OData APIs gebruiken OData v3 syntax:

```
?$filter=<veld> eq '<waarde>' and <veld2> eq '<waarde2>'
&$select=<veld1>,<veld2>,<veld3>
```

**Belangrijke regels:**
- String waarden moeten tussen enkele quotes: `'BU05990504'`
- Meerdere filters combineren met `and`
- Gebruik `$select` om alleen benodigde kolommen op te halen (performance)
- Spaties in regiocodes: CBS codes bevatten soms trailing spaties, trim altijd!

### 4.2 Regiocodes Structuur

| Type | Prefix | Voorbeeld | Lengte |
|------|--------|-----------|--------|
| Gemeente | GM | GM0599 | 6 karakters |
| Wijk | WK | WK059905 | 8 karakters |
| Buurt | BU | BU05990504 | 10 karakters |

**Let op:** In de RIVM dataset kunnen codes trailing spaties bevatten. Altijd trimmen!

---

## 5. Implementatie Queries

### 5.1 RIVM Data Ophalen voor Buurt (50120NED)

**Query voor buurtdata (meest recente jaar, 18+ populatie):**

```javascript
const RIVM_BASE = 'https://dataderden.cbs.nl/ODataApi/OData/50120NED';

async function fetchRIVMBuurtData(buurtcode) {
  // buurtcode format: "BU05990504" (zonder spaties)
  
  const params = new URLSearchParams({
    '$filter': `WijkenEnBuurten eq '${buurtcode}        ' and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'`,
    '$select': [
      'WijkenEnBuurten',
      'Gemeentenaam_1',
      'Codering_3',
      'Eenzaam_27',
      'ErnstigZeerErnstigEenzaam_28',
      'EmotioneelEenzaam_29',
      'SociaalEenzaam_30',
      'HoogRisicoOpAngstOfDepressie_25',
      'PsychischeKlachten_20',
      'HeelVeelStressInAfgelopen4Weken_26',
      'MistEmotioneleSteun_23',
      'ZeerLageVeerkracht_21',
      'Mantelzorger_31',
      'Vrijwilligerswerk_32',
      'ErvarenGezondheidGoedZeerGoed_4',
      'EenOfMeerLangdurigeAandoeningen_16',
      'BeperktVanwegeGezondheid_17',
      'MoeiteMetRondkomen_33'
    ].join(',')
  });

  const response = await fetch(`${RIVM_BASE}/TypedDataSet?${params}`);
  const data = await response.json();
  return data.value[0]; // Eerste (en enige) resultaat
}
```

**BELANGRIJK: WijkenEnBuurten padding**

De RIVM dataset gebruikt 12-karakter brede codes met trailing spaties:
- Buurtcode "BU05990504" wordt opgeslagen als "BU05990504  " (2 spaties)
- Om te filteren moet je de spaties toevoegen OF substring matching gebruiken

**Alternatieve filter met substring (robuuster):**

```javascript
const params = new URLSearchParams({
  '$filter': `startswith(WijkenEnBuurten,'${buurtcode}') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'`
});
```

### 5.2 RIVM Data voor Gemeente (vergelijking)

```javascript
async function fetchRIVMGemeenteData(gemeentecode) {
  // gemeentecode format: "GM0599"
  
  const params = new URLSearchParams({
    '$filter': `startswith(WijkenEnBuurten,'${gemeentecode}') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'`,
    '$select': 'WijkenEnBuurten,Eenzaam_27,ErnstigZeerErnstigEenzaam_28,HoogRisicoOpAngstOfDepressie_25,Mantelzorger_31,ErvarenGezondheidGoedZeerGoed_4'
  });

  const response = await fetch(`${RIVM_BASE}/TypedDataSet?${params}`);
  const data = await response.json();
  return data.value[0];
}
```

### 5.3 RIVM Trenddata Ophalen (meerdere jaren)

```javascript
async function fetchRIVMTrendData(buurtcode) {
  // Haal data op voor alle beschikbare jaren
  const jaren = ['2012JJ00', '2016JJ00', '2020JJ00', '2022JJ00'];
  
  const params = new URLSearchParams({
    '$filter': `startswith(WijkenEnBuurten,'${buurtcode}') and Leeftijd eq '20300' and Marges eq 'MW00000'`,
    '$select': 'WijkenEnBuurten,Perioden,Eenzaam_27,ErnstigZeerErnstigEenzaam_28'
  });

  const response = await fetch(`${RIVM_BASE}/TypedDataSet?${params}`);
  const data = await response.json();
  
  // Resultaat bevat 4 rijen (1 per jaar)
  return data.value;
}
```

### 5.4 CBS Kerncijfers voor Jeugdzorg/WMO (85984NED)

```javascript
const CBS_KWB_BASE = 'https://opendata.cbs.nl/ODataApi/OData/85984NED';

async function fetchCBSZorgData(buurtcode) {
  // Eerst DataProperties ophalen om exacte veldnamen te achterhalen
  // Dit hoeft maar 1x bij initialisatie
  
  const params = new URLSearchParams({
    '$filter': `startswith(WijkenEnBuurten,'${buurtcode}')`,
    '$select': 'WijkenEnBuurten,JongerenMetJeugdzorg_62,PersonenMetEenWmoMaatwerkarrangement_63' // Veldnamen verifiëren!
  });

  const response = await fetch(`${CBS_KWB_BASE}/TypedDataSet?${params}`);
  const data = await response.json();
  return data.value[0];
}
```

**ACTIE VEREIST:** De exacte veldnamen voor Jeugdzorg en WMO in dataset 85984NED moeten worden geverifieerd:

```javascript
// Eenmalig uitvoeren om veldnamen te achterhalen
async function getDataProperties() {
  const response = await fetch(`${CBS_KWB_BASE}/DataProperties`);
  const data = await response.json();
  
  // Filter op Zorg-gerelateerde velden
  const zorgVelden = data.value.filter(prop => 
    prop.Title?.toLowerCase().includes('jeugd') ||
    prop.Title?.toLowerCase().includes('wmo') ||
    prop.Title?.toLowerCase().includes('zorg')
  );
  
  console.log(zorgVelden.map(v => ({ key: v.Key, title: v.Title })));
}
```

---

## 6. Regiocodes Ophalen

### 6.1 Van Buurtnaam naar Buurtcode

De mapping van buurt/wijk/gemeente namen naar codes zit in de `WijkenEnBuurten` endpoint:

```javascript
async function searchRegioCode(searchTerm) {
  const response = await fetch(`${RIVM_BASE}/WijkenEnBuurten`);
  const data = await response.json();
  
  // Filter op naam (Title bevat de naam)
  const matches = data.value.filter(r => 
    r.Title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return matches.map(m => ({
    code: m.Key.trim(),
    naam: m.Title,
    type: m.Key.startsWith('BU') ? 'Buurt' : 
          m.Key.startsWith('WK') ? 'Wijk' : 'Gemeente'
  }));
}
```

### 6.2 Afgeleide Codes

Vanuit een buurtcode kun je de wijk- en gemeentecode afleiden:

```javascript
function getRegioHierarchy(buurtcode) {
  // BU05990504 -> WK059905 -> GM0599
  const gemeenteNummer = buurtcode.substring(2, 6); // "0599"
  const wijkNummer = buurtcode.substring(2, 8);     // "059905"
  
  return {
    buurt: buurtcode,                    // "BU05990504"
    wijk: `WK${wijkNummer}`,             // "WK059905"
    gemeente: `GM${gemeenteNummer}`      // "GM0599"
  };
}
```

---

## 7. Response Data Structuur

### 7.1 RIVM TypedDataSet Response

```json
{
  "odata.metadata": "...",
  "value": [
    {
      "ID": 123456,
      "Leeftijd": "20300",
      "Marges": "MW00000",
      "WijkenEnBuurten": "BU05990504  ",
      "Perioden": "2022JJ00",
      "Gemeentenaam_1": "Rotterdam",
      "SoortRegio_2": "Buurt",
      "Codering_3": "BU05990504",
      "ErvarenGezondheidGoedZeerGoed_4": 72.3,
      "Eenzaam_27": 48.2,
      "ErnstigZeerErnstigEenzaam_28": 12.1,
      "EmotioneelEenzaam_29": 35.6,
      "SociaalEenzaam_30": 42.8,
      "HoogRisicoOpAngstOfDepressie_25": 8.4,
      "PsychischeKlachten_20": 15.2,
      "HeelVeelStressInAfgelopen4Weken_26": 11.3,
      "MistEmotioneleSteun_23": 9.8,
      "ZeerLageVeerkracht_21": 7.2,
      "Mantelzorger_31": 14.5,
      "Vrijwilligerswerk_32": 28.9,
      "EenOfMeerLangdurigeAandoeningen_16": 45.2,
      "BeperktVanwegeGezondheid_17": 18.7,
      "MoeiteMetRondkomen_33": 22.1
    }
  ]
}
```

### 7.2 Null/Missing Values

Waarden kunnen `null` zijn wanneer:
- Data niet beschikbaar is voor die periode
- Te weinig respondenten in dat gebied (privacy)
- Indicator pas later toegevoegd (bijv. SociaalEenzaam_30 vanaf 2016)

**Afhandeling:**
```javascript
function formatPercentage(value) {
  if (value === null || value === undefined) {
    return 'Geen data';
  }
  return `${value.toFixed(1)}%`;
}
```

---

## 8. UI Componenten Specificatie

### 8.1 Sectie 1: Eenzaamheid (Hoofdsectie)

**Layout:** Grote KPI-kaarten + trendgrafiek

| Component | Data | Visualisatie |
|-----------|------|--------------|
| Eenzaamheid totaal | `Eenzaam_27` | Grote KPI met kleur (groen <40%, oranje 40-50%, rood >50%) |
| Ernstig eenzaam | `ErnstigZeerErnstigEenzaam_28` | KPI met kleur |
| Emotioneel vs Sociaal | `EmotioneelEenzaam_29`, `SociaalEenzaam_30` | Twee kleinere KPIs |
| Trend 2016-2022 | Meerdere jaren | Lijngrafiek |
| Benchmark | Buurt vs Gemeente vs Nederland | Vergelijkingsbalk |

**Referentiewaarden Nederland 2022:**
- Eenzaam totaal: 46,2%
- Ernstig eenzaam: 13,2%

### 8.2 Sectie 2: Mentale Gezondheid

**Layout:** KPI-kaarten in grid

| Component | Data | Visualisatie |
|-----------|------|--------------|
| Risico angst/depressie | `HoogRisicoOpAngstOfDepressie_25` | KPI met toelichting |
| Psychische klachten | `PsychischeKlachten_20` | KPI (alleen 2022) |
| Veel stress | `HeelVeelStressInAfgelopen4Weken_26` | KPI |
| Mist emotionele steun | `MistEmotioneleSteun_23` | KPI |
| Lage veerkracht | `ZeerLageVeerkracht_21` | KPI |

### 8.3 Sectie 3: Zorg & Ondersteuning

**Layout:** KPI-kaarten + donut charts

| Component | Data | Visualisatie |
|-----------|------|--------------|
| Mantelzorgers | `Mantelzorger_31` | KPI met percentage |
| Vrijwilligerswerk | `Vrijwilligerswerk_32` | KPI |
| Ervaren gezondheid | `ErvarenGezondheidGoedZeerGoed_4` | KPI (positieve indicator) |
| Langdurige aandoeningen | `EenOfMeerLangdurigeAandoeningen_16` | KPI |
| Beperkt door gezondheid | `BeperktVanwegeGezondheid_17` | KPI |

### 8.4 Sectie 4: Jeugdzorg & WMO (Gemeente context)

**Layout:** Vergelijking buurt vs gemeente

| Component | Data | Visualisatie |
|-----------|------|--------------|
| Jeugdzorg % | CBS 85984NED | KPI + vergelijking |
| WMO-cliënten | CBS 85984NED | KPI + vergelijking |

---

## 9. Error Handling

### 9.1 API Fouten

```javascript
async function fetchWithErrorHandling(url) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Data niet gevonden voor deze regio' };
      }
      if (response.status === 429) {
        // Rate limiting - wacht en probeer opnieuw
        await new Promise(r => setTimeout(r, 1000));
        return fetchWithErrorHandling(url);
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.value || data.value.length === 0) {
      return { error: 'Geen data beschikbaar voor deze regio' };
    }
    
    return { data: data.value };
    
  } catch (error) {
    console.error('API Error:', error);
    return { error: 'Fout bij ophalen data. Probeer later opnieuw.' };
  }
}
```

### 9.2 Ontbrekende Data Weergave

Wanneer data ontbreekt, toon een duidelijke placeholder:

```javascript
function DataCard({ label, value, unit = '%' }) {
  if (value === null || value === undefined) {
    return (
      <div className="data-card no-data">
        <span className="label">{label}</span>
        <span className="value">-</span>
        <span className="note">Geen data beschikbaar</span>
      </div>
    );
  }
  
  return (
    <div className="data-card">
      <span className="label">{label}</span>
      <span className="value">{value.toFixed(1)}{unit}</span>
    </div>
  );
}
```

---

## 10. Performance Optimalisaties

### 10.1 Parallel Fetching

```javascript
async function fetchAllZorgWelzijnData(buurtcode) {
  const { wijk, gemeente } = getRegioHierarchy(buurtcode);
  
  // Parallel ophalen van alle data
  const [buurtData, wijkData, gemeenteData, trendData, cbsData] = await Promise.all([
    fetchRIVMBuurtData(buurtcode),
    fetchRIVMBuurtData(wijk),
    fetchRIVMGemeenteData(gemeente),
    fetchRIVMTrendData(buurtcode),
    fetchCBSZorgData(buurtcode)
  ]);
  
  return {
    buurt: buurtData,
    wijk: wijkData,
    gemeente: gemeenteData,
    trend: trendData,
    cbs: cbsData
  };
}
```

### 10.2 Caching

Implementeer caching voor data die niet vaak wijzigt:

```javascript
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 uur

async function fetchWithCache(url, cacheKey) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetch(url).then(r => r.json());
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

### 10.3 Select Optimization

Altijd `$select` gebruiken om alleen benodigde velden op te halen:

```javascript
// GOED - alleen noodzakelijke velden
const params = new URLSearchParams({
  '$filter': `...`,
  '$select': 'Eenzaam_27,ErnstigZeerErnstigEenzaam_28,Mantelzorger_31'
});

// SLECHT - haalt ALLE velden op (40+ kolommen)
const params = new URLSearchParams({
  '$filter': `...`
});
```

---

## 11. Volledige Code Voorbeeld

```javascript
// zorgWelzijnService.js

const RIVM_BASE = 'https://dataderden.cbs.nl/ODataApi/OData/50120NED';
const CBS_KWB_BASE = 'https://opendata.cbs.nl/ODataApi/OData/85984NED';

// Indicatoren configuratie
const RIVM_INDICATORS = {
  eenzaamheid: {
    totaal: 'Eenzaam_27',
    ernstig: 'ErnstigZeerErnstigEenzaam_28',
    emotioneel: 'EmotioneelEenzaam_29',
    sociaal: 'SociaalEenzaam_30'
  },
  mentaleGezondheid: {
    angstDepressie: 'HoogRisicoOpAngstOfDepressie_25',
    psychischeKlachten: 'PsychischeKlachten_20',
    stress: 'HeelVeelStressInAfgelopen4Weken_26',
    emotioneleSteun: 'MistEmotioneleSteun_23',
    veerkracht: 'ZeerLageVeerkracht_21'
  },
  zorgOndersteuning: {
    mantelzorg: 'Mantelzorger_31',
    vrijwilligerswerk: 'Vrijwilligerswerk_32',
    ervarenGezondheid: 'ErvarenGezondheidGoedZeerGoed_4',
    langdurigeAandoeningen: 'EenOfMeerLangdurigeAandoeningen_16',
    beperkt: 'BeperktVanwegeGezondheid_17',
    moeiteRondkomen: 'MoeiteMetRondkomen_33'
  }
};

// Alle veldnamen als array voor $select
const ALL_RIVM_FIELDS = [
  'WijkenEnBuurten',
  'Gemeentenaam_1',
  'SoortRegio_2',
  'Codering_3',
  ...Object.values(RIVM_INDICATORS.eenzaamheid),
  ...Object.values(RIVM_INDICATORS.mentaleGezondheid),
  ...Object.values(RIVM_INDICATORS.zorgOndersteuning)
];

/**
 * Haal RIVM gezondheidsdata op voor een specifieke regio
 * @param {string} regioCode - BU/WK/GM code (bijv. "BU05990504")
 * @param {string} periode - Jaar code (default: "2022JJ00")
 * @param {string} leeftijd - Leeftijdsgroep (default: "20300" = 18+)
 */
async function fetchRIVMData(regioCode, periode = '2022JJ00', leeftijd = '20300') {
  const filter = [
    `startswith(WijkenEnBuurten,'${regioCode}')`,
    `Perioden eq '${periode}'`,
    `Leeftijd eq '${leeftijd}'`,
    `Marges eq 'MW00000'`
  ].join(' and ');
  
  const params = new URLSearchParams({
    '$filter': filter,
    '$select': ALL_RIVM_FIELDS.join(',')
  });

  try {
    const response = await fetch(`${RIVM_BASE}/TypedDataSet?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data.value || data.value.length === 0) {
      return null;
    }
    
    return data.value[0];
  } catch (error) {
    console.error(`Error fetching RIVM data for ${regioCode}:`, error);
    throw error;
  }
}

/**
 * Haal trend data op (alle jaren) voor een regio
 */
async function fetchRIVMTrendData(regioCode) {
  const filter = [
    `startswith(WijkenEnBuurten,'${regioCode}')`,
    `Leeftijd eq '20300'`,
    `Marges eq 'MW00000'`
  ].join(' and ');
  
  const params = new URLSearchParams({
    '$filter': filter,
    '$select': 'WijkenEnBuurten,Perioden,Eenzaam_27,ErnstigZeerErnstigEenzaam_28,HoogRisicoOpAngstOfDepressie_25'
  });

  const response = await fetch(`${RIVM_BASE}/TypedDataSet?${params}`);
  const data = await response.json();
  
  // Sorteer op periode
  return data.value.sort((a, b) => a.Perioden.localeCompare(b.Perioden));
}

/**
 * Haal alle Zorg & Welzijn data op voor dashboard
 */
async function fetchZorgWelzijnDashboard(buurtcode) {
  // Bepaal hiërarchie
  const gemeenteNummer = buurtcode.substring(2, 6);
  const wijkNummer = buurtcode.substring(2, 8);
  const wijkcode = `WK${wijkNummer}`;
  const gemeentecode = `GM${gemeenteNummer}`;

  // Parallel ophalen
  const [buurt, wijk, gemeente, trend] = await Promise.all([
    fetchRIVMData(buurtcode),
    fetchRIVMData(wijkcode),
    fetchRIVMData(gemeentecode),
    fetchRIVMTrendData(buurtcode)
  ]);

  return {
    buurt,
    wijk,
    gemeente,
    trend,
    referentie: {
      // Landelijke cijfers 2022 (hardcoded referentie)
      nederland: {
        eenzaam: 46.2,
        ernstigEenzaam: 13.2
      }
    }
  };
}

export {
  fetchRIVMData,
  fetchRIVMTrendData,
  fetchZorgWelzijnDashboard,
  RIVM_INDICATORS
};
```

---

## 12. Checklist voor Implementatie

### Voorbereiding
- [ ] Verifieer veldnamen CBS 85984NED via DataProperties endpoint
- [ ] Test API calls handmatig in browser/Postman
- [ ] Controleer of regiocodes correct worden geformatteerd (spaties!)

### Backend/API Layer
- [ ] Implementeer fetchRIVMData functie
- [ ] Implementeer fetchRIVMTrendData functie  
- [ ] Implementeer fetchCBSZorgData functie
- [ ] Implementeer caching mechanisme
- [ ] Implementeer error handling

### Frontend/UI
- [ ] Maak Zorg & Welzijn tab component
- [ ] Implementeer Eenzaamheid sectie met KPIs
- [ ] Implementeer Mentale Gezondheid sectie
- [ ] Implementeer Zorg & Ondersteuning sectie
- [ ] Implementeer Jeugdzorg/WMO sectie
- [ ] Voeg trend grafiek toe
- [ ] Voeg benchmark vergelijking toe
- [ ] Style consistent met bestaande tabs

### Testing
- [ ] Test met verschillende buurten (ook zonder data)
- [ ] Test error handling bij API failures
- [ ] Test performance met parallel fetching
- [ ] Verifieer dat nulls correct worden afgehandeld

---

## 13. Bronnen en Referenties

### API Documentatie
- CBS OData Handleiding: https://www.cbs.nl/-/media/_pdf/2017/13/handleiding-cbs-open-data-services.pdf
- CBS Snelstartgids OData v4: https://www.cbs.nl/nl-nl/onze-diensten/open-data/statline-als-open-data/snelstartgids-odata-v4
- RIVM StatLine: https://statline.rivm.nl/

### Dataset Documentatie
- RIVM 50120NED (Gezondheid per wijk/buurt): https://statline.rivm.nl/#/RIVM/nl/dataset/50120NED/table
- CBS 85984NED (Kerncijfers wijken/buurten 2024): https://www.cbs.nl/nl-nl/cijfers/detail/85984NED

### Eenzaamheidsschaal
- De Jong Gierveld eenzaamheidsschaal: https://www.rivm.nl/mentale-gezondheid/monitor/algemene-bevolking/eenzaamheid

---

## 14. Contactgegevens voor Support

- CBS Open Data LinkedIn groep: "Centraal Bureau voor de Statistiek; Open Data"
- CBS Infoservice: infoservice@cbs.nl
