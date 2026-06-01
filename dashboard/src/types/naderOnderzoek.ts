export interface NaderOnderzoekTopic {
  id: string;
  buurtcode: string;
  titel: string;
  volgorde: number;
  is_default: boolean;
  medewerker: string | null;
  created_at: string;
  updated_at: string;
}

export interface NaderOnderzoekVraag {
  id: string;
  topic_id: string;
  vraag: string;
  antwoord: string;
  is_suggestie: boolean;
  volgorde: number;
  medewerker: string | null;
  created_at: string;
  updated_at: string;
}

export interface NaderOnderzoekSeedTopic {
  titel: string;
  vragen: string[];
}
