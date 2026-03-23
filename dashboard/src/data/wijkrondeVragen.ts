import type { WijkrondeVraag } from '../types/wijkronde';

export const wijkrondeVragen: WijkrondeVraag[] = [
  // ── Algemene gegevens ─────────────────────────────────
  {
    id: 'datum_tijdstip',
    tekst: 'Datum en tijdstip',
    categorie: 'Algemene gegevens',
    type: 'datum-tijd',
  },
  {
    id: 'weersomstandigheden',
    tekst: 'Weersomstandigheden',
    categorie: 'Algemene gegevens',
    type: 'keuze',
    opties: ['Zonnig', 'Bewolkt', 'Licht bewolkt', 'Regen', 'Motregen', 'Storm/wind', 'Sneeuw', 'Mist'],
  },
  {
    id: 'observatoren',
    tekst: 'Observator(s)',
    categorie: 'Algemene gegevens',
    type: 'auto-gebruiker',
  },
  {
    id: 'route_straten',
    tekst: 'Route / straten gelopen',
    categorie: 'Algemene gegevens',
    type: 'tekst',
  },

  // ── 1. Fysieke leefomgeving — Straat en openbare ruimte ──
  {
    id: 'staat_straatwerk',
    tekst: 'Staat van het straatwerk',
    categorie: '1. Straat en openbare ruimte',
    type: 'keuze',
    opties: ['Goed', 'Matig', 'Slecht'],
  },
  {
    id: 'stoepen_begaanbaar',
    tekst: 'Stoepen/paden aanwezig en begaanbaar',
    categorie: '1. Straat en openbare ruimte',
    type: 'keuze',
    opties: ['Ja', 'Deels', 'Nee'],
  },
  {
    id: 'schade_openbare_ruimte',
    tekst: 'Zichtbare schade of achterstallig onderhoud in de openbare ruimte? Zo ja, waar?',
    categorie: '1. Straat en openbare ruimte',
    type: 'tekst',
  },

  // ── 1. Fysieke leefomgeving — Verlichting ─────────────
  {
    id: 'verlichting_openbare_weg',
    tekst: 'Straatverlichting openbare weg aanwezig',
    categorie: '1. Verlichting',
    type: 'ja-nee',
  },
  {
    id: 'verlichting_achterpaden',
    tekst: 'Verlichting achterpaden aanwezig',
    categorie: '1. Verlichting',
    type: 'ja-nee',
  },
  {
    id: 'verlichting_functioneert',
    tekst: 'Verlichting functioneert goed',
    categorie: '1. Verlichting',
    type: 'keuze',
    opties: ['Ja', 'Deels', 'Nee'],
  },
  {
    id: 'donkere_plekken',
    tekst: 'Donkere of onoverzichtelijke plekken (locatie)',
    categorie: '1. Verlichting',
    type: 'tekst',
  },
  {
    id: 'verlichting_voordeuren',
    tekst: 'Verlichting bij voordeuren aanwezig',
    categorie: '1. Verlichting',
    type: 'keuze',
    opties: ['Ja', 'Deels', 'Nee'],
  },

  // ── 1. Fysieke leefomgeving — Groen en buitenruimte ──
  {
    id: 'groenvoorzieningen_aanwezig',
    tekst: 'Groenvoorzieningen aanwezig (bomen, plantsoen, park)',
    categorie: '1. Groen en buitenruimte',
    type: 'ja-nee',
  },
  {
    id: 'onderhoud_groen',
    tekst: 'Onderhoudsniveau groen',
    categorie: '1. Groen en buitenruimte',
    type: 'keuze',
    opties: ['Goed', 'Matig', 'Slecht'],
  },
  {
    id: 'groen_gebruikt',
    tekst: 'Wordt het groen zichtbaar gebruikt?',
    categorie: '1. Groen en buitenruimte',
    type: 'ja-nee',
  },
  {
    id: 'ontmoeting_groen',
    tekst: 'Voorzieningen voor sociale ontmoeting bij groenvoorziening aanwezig?',
    categorie: '1. Groen en buitenruimte',
    type: 'ja-nee',
  },

  // ── 1. Fysieke leefomgeving — Voorzieningen ──────────
  {
    id: 'speeltuin_aanwezig',
    tekst: 'Speeltuin aanwezig',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'ja-nee',
  },
  {
    id: 'speeltuin_staat',
    tekst: 'Staat speeltuin',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'keuze',
    opties: ['Goed', 'Matig', 'Slecht', 'N.v.t.'],
  },
  {
    id: 'speeltuin_leeftijd',
    tekst: 'Speeltuin voor welke leeftijdscategorie?',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'keuze',
    opties: ['Jonge kinderen', 'Basisschool', 'Tieners', 'N.v.t.'],
  },
  {
    id: 'sportveld_aanwezig',
    tekst: 'Sportveld aanwezig',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'ja-nee',
  },
  {
    id: 'sportveld_staat',
    tekst: 'Staat sportveld',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'keuze',
    opties: ['Goed', 'Matig', 'Slecht', 'N.v.t.'],
  },
  {
    id: 'school_kinderopvang',
    tekst: 'School / kinderopvang aanwezig',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'ja-nee',
  },
  {
    id: 'zorgvoorzieningen',
    tekst: 'Zorgvoorzieningen aanwezig',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'ja-nee',
  },
  {
    id: 'winkels_buurtvoorzieningen',
    tekst: 'Winkels / buurtvoorzieningen aanwezig',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'ja-nee',
  },
  {
    id: 'wijkcentrum_aanwezig',
    tekst: 'Wijkcentrum of buurtkamer aanwezig',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'ja-nee',
  },
  {
    id: 'wijkcentrum_welke',
    tekst: 'Zo ja, welke?',
    categorie: '1. Voorzieningen in/nabij de wijk',
    type: 'tekst',
  },

  // ── 1. Sociale cohesie en gebruik openbare ruimte ────
  {
    id: 'openbare_ruimte_gebruik',
    tekst: 'Wordt de openbare ruimte gebruikt tijdens de wijkopname?',
    categorie: '1. Sociale cohesie en gebruik openbare ruimte',
    type: 'ja-nee',
  },
  {
    id: 'spelende_kinderen',
    tekst: 'Spelende kinderen?',
    categorie: '1. Sociale cohesie en gebruik openbare ruimte',
    type: 'ja-nee',
  },
  {
    id: 'spelende_kinderen_locatie',
    tekst: 'Locatie spelende kinderen',
    categorie: '1. Sociale cohesie en gebruik openbare ruimte',
    type: 'tekst',
  },
  {
    id: 'gebruik_bankjes_pleinen',
    tekst: 'Gebruik bankjes / pleinen / parkjes',
    categorie: '1. Sociale cohesie en gebruik openbare ruimte',
    type: 'ja-nee',
  },
  {
    id: 'interactie_bewoners',
    tekst: 'Interactie tussen bewoners zichtbaar',
    categorie: '1. Sociale cohesie en gebruik openbare ruimte',
    type: 'ja-nee',
  },
  {
    id: 'ontmoetingsplekken_aanwezig',
    tekst: 'Ontmoetingsplekken aanwezig (bankjes, speeltuin, plein, buurtkamer)',
    categorie: '1. Sociale cohesie en gebruik openbare ruimte',
    type: 'ja-nee',
  },
  {
    id: 'ontmoetingsplekken_welke',
    tekst: 'Welke ontmoetingsplekken?',
    categorie: '1. Sociale cohesie en gebruik openbare ruimte',
    type: 'tekst',
  },

  // ── 1. Bereikbaarheid ─────────────────────────────────
  {
    id: 'voorzieningen_lopend',
    tekst: 'Voorzieningen lopend bereikbaar',
    categorie: '1. Bereikbaarheid',
    type: 'ja-nee',
  },
  {
    id: 'voorzieningen_in_gebruik',
    tekst: 'Voorzieningen zichtbaar in gebruik',
    categorie: '1. Bereikbaarheid',
    type: 'ja-nee',
  },

  // ── 2. Verkeer en bereikbaarheid — Verkeerssituatie ───
  {
    id: 'type_verkeer',
    tekst: 'Type verkeer',
    categorie: '2. Verkeerssituatie',
    type: 'keuze',
    opties: ['Auto', 'Fiets', 'Gemengd'],
  },
  {
    id: 'verkeersdrukte',
    tekst: 'Verkeersdrukte',
    categorie: '2. Verkeerssituatie',
    type: 'keuze',
    opties: ['Laag', 'Gemiddeld', 'Hoog'],
  },
  {
    id: 'eenrichtingsverkeer',
    tekst: 'Eenrichtingsverkeer',
    categorie: '2. Verkeerssituatie',
    type: 'ja-nee',
  },
  {
    id: 'snelheidsbeleving',
    tekst: 'Snelheidsbeleving',
    categorie: '2. Verkeerssituatie',
    type: 'keuze',
    opties: ['Rustig', 'Wisselend', 'Onrustig'],
  },
  {
    id: 'fietsenstallingen',
    tekst: 'Fietsenstallingen aanwezig',
    categorie: '2. Verkeerssituatie',
    type: 'ja-nee',
  },

  // ── 2. Verkeer en bereikbaarheid — Parkeren ───────────
  {
    id: 'parkeren_aanwezig',
    tekst: 'Parkeergelegenheid aanwezig',
    categorie: '2. Parkeren',
    type: 'ja-nee',
  },
  {
    id: 'parkeerdruk',
    tekst: 'Parkeerdruk',
    categorie: '2. Parkeren',
    type: 'keuze',
    opties: ['Laag', 'Gemiddeld', 'Hoog'],
  },
  {
    id: 'hinderlijk_parkeren',
    tekst: 'Hinderlijk of illegaal parkeren zichtbaar',
    categorie: '2. Parkeren',
    type: 'ja-nee',
  },

  // ── 3. Veiligheid — Overzicht en zichtlijnen ──────────
  {
    id: 'overzichtelijkheid_straten',
    tekst: 'Overzichtelijkheid straten',
    categorie: '3. Overzicht en zichtlijnen',
    type: 'keuze',
    opties: ['Goed', 'Matig', 'Slecht'],
  },
  {
    id: 'zichtbaarheid_straat',
    tekst: 'Zichtbaarheid in de straat (vrij zicht, steegjes, blinde hoeken, smalle doorgangen)',
    categorie: '3. Overzicht en zichtlijnen',
    type: 'keuze',
    opties: ['Goed', 'Beperkt', 'Slecht'],
  },
  {
    id: 'zichtbaarheid_toelichting',
    tekst: 'Toelichting en locatie(s) zichtbaarheid',
    categorie: '3. Overzicht en zichtlijnen',
    type: 'tekst',
  },

  // ── 3. Veiligheid — Sociale veiligheid ────────────────
  {
    id: 'mensen_op_straat',
    tekst: 'Mensen zichtbaar op straat',
    categorie: '3. Sociale veiligheid',
    type: 'keuze',
    opties: ['Weinig', 'Gemiddeld', 'Veel'],
  },
  {
    id: 'begroet_tijdens_ronde',
    tekst: 'Worden we begroet tijdens de ronde?',
    categorie: '3. Sociale veiligheid',
    type: 'ja-nee',
  },
  {
    id: 'naambordjes_deuren',
    tekst: "Hangen er naambordjes bij de deuren of bellentableau's?",
    categorie: '3. Sociale veiligheid',
    type: 'ja-nee',
  },

  // ── 3. Veiligheid — Signalen ──────────────────────────
  {
    id: 'vandalisme_zichtbaar',
    tekst: 'Vandalisme/schade zichtbaar aan openbare ruimtes',
    categorie: '3. Signalen',
    type: 'ja-nee',
  },
  {
    id: 'afval_op_straat',
    tekst: 'Afval op straat',
    categorie: '3. Signalen',
    type: 'keuze',
    opties: ['Weinig', 'Gemiddeld', 'Veel'],
  },
  {
    id: 'hangplekken',
    tekst: 'Hangplekken zichtbaar (locatie)',
    categorie: '3. Signalen',
    type: 'tekst',
  },
  {
    id: 'grofvuil_containers',
    tekst: 'Grofvuil rondom containerplaatsen aanwezig',
    categorie: '3. Signalen',
    type: 'ja-nee',
  },

  // ── 4. Wonen en woninggebruik ─────────────────────────
  {
    id: 'gordijnen_overdag',
    tekst: 'Gordijnen overdag',
    categorie: '4. Wonen en woninggebruik',
    type: 'keuze',
    opties: ['Overwegend open', 'Wisselend', 'Overwegend dicht'],
  },
  {
    id: 'staat_voortuinen_entrees',
    tekst: 'Staat voortuinen/entrees',
    categorie: '4. Wonen en woninggebruik',
    type: 'keuze',
    opties: ['Verzorgd', 'Wisselend', 'Onverzorgd'],
  },
  {
    id: 'persoonlijke_inrichting',
    tekst: 'Persoonlijke inrichting zichtbaar (planten, meubels)',
    categorie: '4. Wonen en woninggebruik',
    type: 'ja-nee',
  },
  {
    id: 'onderhoud_voortuinen',
    tekst: 'Onderhoud voortuinen',
    categorie: '4. Wonen en woninggebruik',
    type: 'keuze',
    opties: ['Groen', 'Overwegend bestraat', 'Vol met spullen/achterstallig onderhoud'],
  },

  // ── 8. Algemene indruk en bijzonderheden ──────────────
  {
    id: 'algemene_sfeer',
    tekst: 'Algemene sfeer wijk',
    categorie: '8. Algemene indruk en bijzonderheden',
    type: 'keuze',
    opties: ['Rustig', 'Levendig', 'Gemengd'],
  },
  {
    id: 'positieve_elementen',
    tekst: 'Positieve opvallende elementen',
    categorie: '8. Algemene indruk en bijzonderheden',
    type: 'tekst',
  },
  {
    id: 'aandachtspunten',
    tekst: 'Aandachtspunten / zorgpunten',
    categorie: '8. Algemene indruk en bijzonderheden',
    type: 'tekst',
  },
  {
    id: 'overige_observaties',
    tekst: 'Overige observaties',
    categorie: '8. Algemene indruk en bijzonderheden',
    type: 'tekst',
  },

  // ── 9. Reflectie & kansen (na de wijkronde) ───────────
  {
    id: 'sociale_kansen',
    tekst: 'Welke sociale kansen zien we om bewoners te betrekken of te ontzorgen?',
    categorie: '9. Reflectie & kansen',
    type: 'tekst',
  },
  {
    id: 'risicos_weerstand',
    tekst: 'Welke risico\'s op weerstand, frustratie of onduidelijkheid signaleren we?',
    categorie: '9. Reflectie & kansen',
    type: 'tekst',
  },
  {
    id: 'communicatie_vraag',
    tekst: 'Wat vraagt deze wijk van onze communicatie (vorm, toon, kanalen)?',
    categorie: '9. Reflectie & kansen',
    type: 'tekst',
  },
  {
    id: 'vertrouwen_opbouwen',
    tekst: 'Hoe kunnen wij vertrouwen opbouwen of versterken in deze wijk?',
    categorie: '9. Reflectie & kansen',
    type: 'tekst',
  },
];
