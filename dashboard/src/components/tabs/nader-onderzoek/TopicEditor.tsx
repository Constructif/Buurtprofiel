import { useState, useEffect, useCallback, useRef } from 'react';
import type { NaderOnderzoekTopic, NaderOnderzoekVraag } from '../../../types/naderOnderzoek';
import {
  fetchVragenForTopic,
  createVraag,
  updateVraagAntwoord,
  updateVraagTekst,
  deleteVraag,
} from '../../../services/naderOnderzoek';
import { logger } from '../../../utils/logger';

interface Props {
  topic: NaderOnderzoekTopic;
}

export function TopicEditor({ topic }: Props) {
  const [vragen, setVragen] = useState<NaderOnderzoekVraag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [nieuweVraag, setNieuweVraag] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingVraagId, setEditingVraagId] = useState<string | null>(null);
  const [editingVraagValue, setEditingVraagValue] = useState('');
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadVragen = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVragenForTopic(topic.id);
      setVragen(data);
    } catch (err) {
      logger.error('Fout bij laden vragen:', err);
    } finally {
      setLoading(false);
    }
  }, [topic.id]);

  useEffect(() => {
    loadVragen();
  }, [loadVragen]);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const saveAntwoord = useCallback(async (vraagId: string, value: string) => {
    setSaving((prev) => ({ ...prev, [vraagId]: true }));
    try {
      await updateVraagAntwoord(vraagId, value);
    } catch (err) {
      logger.error('Fout bij opslaan antwoord:', err);
    } finally {
      setSaving((prev) => ({ ...prev, [vraagId]: false }));
    }
  }, []);

  const handleAntwoordChange = (vraagId: string, value: string) => {
    setVragen((prev) =>
      prev.map((v) => (v.id === vraagId ? { ...v, antwoord: value } : v)),
    );
    if (debounceTimers.current[vraagId]) {
      clearTimeout(debounceTimers.current[vraagId]);
    }
    debounceTimers.current[vraagId] = setTimeout(() => {
      saveAntwoord(vraagId, value);
    }, 800);
  };

  const handleAddVraag = async () => {
    const vraag = nieuweVraag.trim();
    if (!vraag) return;
    setAdding(true);
    try {
      const volgorde = vragen.length;
      const nieuw = await createVraag({
        topic_id: topic.id,
        vraag,
        is_suggestie: false,
        volgorde,
      });
      setVragen((prev) => [...prev, nieuw]);
      setNieuweVraag('');
    } catch (err) {
      logger.error('Fout bij toevoegen vraag:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteVraag = async (id: string) => {
    try {
      await deleteVraag(id);
      setVragen((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      logger.error('Fout bij verwijderen vraag:', err);
    }
  };

  const startEditVraag = (v: NaderOnderzoekVraag) => {
    setEditingVraagId(v.id);
    setEditingVraagValue(v.vraag);
  };

  const saveEditVraag = async () => {
    if (!editingVraagId) return;
    const tekst = editingVraagValue.trim();
    if (!tekst) {
      setEditingVraagId(null);
      return;
    }
    try {
      await updateVraagTekst(editingVraagId, tekst);
      setVragen((prev) =>
        prev.map((v) => (v.id === editingVraagId ? { ...v, vraag: tekst } : v)),
      );
    } catch (err) {
      logger.error('Fout bij wijzigen vraagtekst:', err);
    } finally {
      setEditingVraagId(null);
      setEditingVraagValue('');
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1b', marginTop: 0, marginBottom: '4px' }}>
        {topic.titel}
      </h2>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: 0, marginBottom: '20px' }}>
        Vul per vraag je bevindingen in. Antwoorden worden automatisch opgeslagen. Voeg onderaan eigen vragen toe.
      </p>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>Laden...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {vragen.map((v) => (
            <div
              key={v.id}
              style={{
                border: '1px solid #f1f1f1',
                borderRadius: '8px',
                padding: '12px 14px',
                backgroundColor: '#fafafa',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                {editingVraagId === v.id ? (
                  <input
                    autoFocus
                    value={editingVraagValue}
                    onChange={(e) => setEditingVraagValue(e.target.value)}
                    onBlur={saveEditVraag}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditVraag();
                      if (e.key === 'Escape') setEditingVraagId(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      border: '2px solid #eb6608',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <label
                    onDoubleClick={() => startEditVraag(v)}
                    title="Dubbelklik om vraag aan te passen"
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#1d1d1b',
                      flex: 1,
                      cursor: 'text',
                    }}
                  >
                    {v.vraag}
                    {v.is_suggestie && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: '#eb6608',
                          backgroundColor: '#fff7ed',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginLeft: '8px',
                        }}
                      >
                        suggestie
                      </span>
                    )}
                  </label>
                )}

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  {saving[v.id] && (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>opslaan...</span>
                  )}
                  <button
                    onClick={() => handleDeleteVraag(v.id)}
                    title="Vraag verwijderen"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      border: '1px solid #e5c7c4',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      color: '#c0392b',
                      cursor: 'pointer',
                    }}
                  >
                    X
                  </button>
                </div>
              </div>
              <textarea
                value={v.antwoord}
                onChange={(e) => handleAntwoordChange(v.id, e.target.value)}
                placeholder="Bevindingen, contacten, bronnen..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {vragen.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', padding: '12px' }}>
              Nog geen vragen. Voeg hieronder een eerste vraag toe.
            </p>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f1f1',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          value={nieuweVraag}
          onChange={(e) => setNieuweVraag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddVraag();
          }}
          placeholder="Eigen vraag toevoegen..."
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: '13px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            outline: 'none',
            minHeight: '36px',
          }}
        />
        <button
          onClick={handleAddVraag}
          disabled={adding || !nieuweVraag.trim()}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#eb6608',
            color: '#fff',
            cursor: adding || !nieuweVraag.trim() ? 'default' : 'pointer',
            opacity: adding || !nieuweVraag.trim() ? 0.5 : 1,
            minHeight: '36px',
            whiteSpace: 'nowrap',
          }}
        >
          {adding ? '...' : '+ Vraag toevoegen'}
        </button>
      </div>
    </div>
  );
}
