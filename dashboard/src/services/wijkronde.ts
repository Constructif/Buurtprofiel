import { supabase } from './supabase';
import type { Wijkronde, Wijkobservatie, WijkrondeAntwoord, ObservatieCategorie } from '../types/wijkronde';

// ── Rondes ──────────────────────────────────────────────

export async function fetchRondesForBuurt(buurtcode: string): Promise<Wijkronde[]> {
  const { data, error } = await supabase
    .from('wijkrondes')
    .select('*')
    .eq('buurtcode', buurtcode)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createRonde(buurtcode: string, buurtnaam: string): Promise<Wijkronde> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { data, error } = await supabase
    .from('wijkrondes')
    .insert({
      buurtcode,
      buurtnaam,
      medewerker: user.id,
      status: 'actief',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function sluitRonde(rondeId: string): Promise<void> {
  const { error } = await supabase
    .from('wijkrondes')
    .update({
      status: 'afgerond',
      finished_at: new Date().toISOString(),
    })
    .eq('id', rondeId);

  if (error) throw error;
}

export async function deleteRonde(rondeId: string): Promise<void> {
  // Observaties en antwoorden worden automatisch verwijderd via ON DELETE CASCADE
  const { error } = await supabase
    .from('wijkrondes')
    .delete()
    .eq('id', rondeId);

  if (error) throw error;
}

// ── Observaties ─────────────────────────────────────────

export async function fetchObservaties(rondeId: string): Promise<Wijkobservatie[]> {
  const { data, error } = await supabase
    .from('wijkobservaties')
    .select('*')
    .eq('ronde_id', rondeId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createObservatie(params: {
  buurtcode: string;
  lat: number;
  lng: number;
  categorie: ObservatieCategorie;
  opmerking: string | null;
  foto_url: string | null;
  foto_path: string | null;
  ronde_id: string;
}): Promise<Wijkobservatie> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { data, error } = await supabase
    .from('wijkobservaties')
    .insert({ ...params, medewerker: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteObservatie(id: string): Promise<void> {
  const { error } = await supabase
    .from('wijkobservaties')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Foto upload ─────────────────────────────────────────

export async function uploadFoto(
  buurtcode: string,
  rondeId: string,
  blob: Blob,
): Promise<{ url: string; path: string }> {
  const timestamp = Date.now();
  const path = `${buurtcode}/${rondeId}/${timestamp}.jpg`;

  const { error } = await supabase.storage
    .from('wijkfotos')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('wijkfotos')
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

// ── Antwoorden ──────────────────────────────────────────

export async function fetchAntwoorden(rondeId: string): Promise<WijkrondeAntwoord[]> {
  const { data, error } = await supabase
    .from('wijkronde_antwoorden')
    .select('*')
    .eq('ronde_id', rondeId);

  if (error) throw error;
  return data ?? [];
}

export async function upsertAntwoord(params: {
  buurtcode: string;
  ronde_id: string;
  vraag_id: string;
  antwoord: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { error } = await supabase
    .from('wijkronde_antwoorden')
    .upsert(
      { ...params, medewerker: user.id },
      { onConflict: 'ronde_id,vraag_id' },
    );

  if (error) throw error;
}
