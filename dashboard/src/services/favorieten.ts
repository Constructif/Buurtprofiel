import { supabase } from './supabase';
import type { Favoriet } from '../types/favorieten';
import type { Gebied } from '../types/gebied';

// ── Favorieten ──────────────────────────────────────────

export async function fetchFavorieten(): Promise<Favoriet[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { data, error } = await supabase
    .from('user_favorieten')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addFavoriet(gebied: Gebied): Promise<Favoriet> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { data, error } = await supabase
    .from('user_favorieten')
    .insert({
      user_id: user.id,
      gebied_code: gebied.code,
      gebied_naam: gebied.naam,
      gebied_type: gebied.type,
      gebied_gemeente_naam: gebied.gemeenteNaam ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavoriet(gebiedCode: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { error } = await supabase
    .from('user_favorieten')
    .delete()
    .eq('user_id', user.id)
    .eq('gebied_code', gebiedCode);

  if (error) throw error;
}
