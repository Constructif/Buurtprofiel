export interface Favoriet {
  id: string;
  user_id: string;
  gebied_code: string;
  gebied_naam: string;
  gebied_type: 'buurt' | 'wijk' | 'gemeente';
  gebied_gemeente_naam: string | null;
  created_at: string;
}
