import { supabase } from './supabase';
import type { NaderOnderzoekTopic, NaderOnderzoekVraag } from '../types/naderOnderzoek';
import { naderOnderzoekSuggesties } from '../data/naderOnderzoekSuggesties';

// ── Topics ──────────────────────────────────────────────

export async function fetchTopicsForBuurt(buurtcode: string): Promise<NaderOnderzoekTopic[]> {
  const { data, error } = await supabase
    .from('nader_onderzoek_topics')
    .select('*')
    .eq('buurtcode', buurtcode)
    .order('volgorde', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createTopic(params: {
  buurtcode: string;
  titel: string;
  volgorde: number;
  is_default?: boolean;
}): Promise<NaderOnderzoekTopic> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { data, error } = await supabase
    .from('nader_onderzoek_topics')
    .insert({
      buurtcode: params.buurtcode,
      titel: params.titel,
      volgorde: params.volgorde,
      is_default: params.is_default ?? false,
      medewerker: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTopicTitel(id: string, titel: string): Promise<void> {
  const { error } = await supabase
    .from('nader_onderzoek_topics')
    .update({ titel })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase
    .from('nader_onderzoek_topics')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Vragen ──────────────────────────────────────────────

export async function fetchVragenForTopic(topicId: string): Promise<NaderOnderzoekVraag[]> {
  const { data, error } = await supabase
    .from('nader_onderzoek_vragen')
    .select('*')
    .eq('topic_id', topicId)
    .order('volgorde', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createVraag(params: {
  topic_id: string;
  vraag: string;
  is_suggestie?: boolean;
  volgorde: number;
  antwoord?: string;
}): Promise<NaderOnderzoekVraag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { data, error } = await supabase
    .from('nader_onderzoek_vragen')
    .insert({
      topic_id: params.topic_id,
      vraag: params.vraag,
      antwoord: params.antwoord ?? '',
      is_suggestie: params.is_suggestie ?? false,
      volgorde: params.volgorde,
      medewerker: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVraagAntwoord(id: string, antwoord: string): Promise<void> {
  const { error } = await supabase
    .from('nader_onderzoek_vragen')
    .update({ antwoord })
    .eq('id', id);

  if (error) throw error;
}

export async function updateVraagTekst(id: string, vraag: string): Promise<void> {
  const { error } = await supabase
    .from('nader_onderzoek_vragen')
    .update({ vraag })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteVraag(id: string): Promise<void> {
  const { error } = await supabase
    .from('nader_onderzoek_vragen')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Seed: voorgedefinieerde onderwerpen + vragen ───────

export async function seedDefaultTopics(buurtcode: string): Promise<NaderOnderzoekTopic[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const topicRows = naderOnderzoekSuggesties.map((t, idx) => ({
    buurtcode,
    titel: t.titel,
    volgorde: idx,
    is_default: true,
    medewerker: user.id,
  }));

  const { data: topics, error: topicsError } = await supabase
    .from('nader_onderzoek_topics')
    .insert(topicRows)
    .select();

  if (topicsError) throw topicsError;
  if (!topics) return [];

  const vraagRows = topics.flatMap((topic) => {
    const seed = naderOnderzoekSuggesties.find((s) => s.titel === topic.titel);
    if (!seed) return [];
    return seed.vragen.map((v, idx) => ({
      topic_id: topic.id,
      vraag: v,
      antwoord: '',
      is_suggestie: true,
      volgorde: idx,
      medewerker: user.id,
    }));
  });

  if (vraagRows.length > 0) {
    const { error: vragenError } = await supabase
      .from('nader_onderzoek_vragen')
      .insert(vraagRows);
    if (vragenError) throw vragenError;
  }

  return topics.sort((a, b) => a.volgorde - b.volgorde);
}
