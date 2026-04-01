import { useState, useEffect, useCallback, useRef } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { useAuthStore } from '../../../store/authStore';
import { wijkrondeVragen } from '../../../data/wijkrondeVragen';
import { fetchAntwoorden, upsertAntwoord } from '../../../services/wijkronde';
import { logger } from '../../../utils/logger';
import type { WijkrondeAntwoord } from '../../../types/wijkronde';

const SCORE_LABELS = ['Slecht', 'Matig', 'Voldoende', 'Goed', 'Uitstekend'];

export function VragenPanel() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const actieveRonde = useGebiedStore((s) => s.actieveRonde);
  const user = useAuthStore((s) => s.user);

  const [antwoorden, setAntwoorden] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isReadOnly = false;

  const loadAntwoorden = useCallback(async () => {
    if (!actieveRonde) return;
    setLoading(true);
    try {
      const data = await fetchAntwoorden(actieveRonde.id);
      const map: Record<string, string> = {};
      data.forEach((a: WijkrondeAntwoord) => {
        map[a.vraag_id] = a.antwoord;
      });
      setAntwoorden(map);
    } catch (error) {
      logger.error('Fout bij laden antwoorden:', error);
    } finally {
      setLoading(false);
    }
  }, [actieveRonde]);

  useEffect(() => {
    loadAntwoorden();
  }, [loadAntwoorden]);

  // Cleanup timers
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const saveAntwoord = useCallback(async (vraagId: string, value: string) => {
    if (!actieveRonde || !selectedGebied) return;

    setSaving(vraagId);
    try {
      await upsertAntwoord({
        buurtcode: selectedGebied.code,
        ronde_id: actieveRonde.id,
        vraag_id: vraagId,
        antwoord: value,
      });
    } catch (error) {
      logger.error('Fout bij opslaan antwoord:', error);
    } finally {
      setSaving(null);
    }
  }, [actieveRonde, selectedGebied]);

  const handleChange = (vraagId: string, value: string) => {
    setAntwoorden((prev) => ({ ...prev, [vraagId]: value }));

    // Debounce voor tekstvelden
    if (debounceTimers.current[vraagId]) {
      clearTimeout(debounceTimers.current[vraagId]);
    }
    debounceTimers.current[vraagId] = setTimeout(() => {
      saveAntwoord(vraagId, value);
    }, 800);
  };

  const handleScoreClick = (vraagId: string, score: string) => {
    setAntwoorden((prev) => ({ ...prev, [vraagId]: score }));
    saveAntwoord(vraagId, score);
  };

  if (!selectedGebied || !actieveRonde) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
        {!selectedGebied
          ? 'Selecteer eerst een buurt.'
          : 'Selecteer of start een ronde om de vragenlijst in te vullen.'}
      </div>
    );
  }

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Laden...</p>;
  }

  // Groepeer vragen per categorie
  const categorieGroepen = wijkrondeVragen.reduce<Record<string, typeof wijkrondeVragen>>((acc, vraag) => {
    if (!acc[vraag.categorie]) acc[vraag.categorie] = [];
    acc[vraag.categorie].push(vraag);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '700px' }}>
      {Object.entries(categorieGroepen).map(([categorie, vragen]) => (
        <div key={categorie} style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1d1d1b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
            paddingBottom: '6px',
            borderBottom: '2px solid #e5e7eb',
          }}>
            {categorie}
          </h4>

          {vragen.map((vraag) => (
            <div
              key={vraag.id}
              style={{
                padding: '16px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                marginBottom: '8px',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1d1d1b', marginBottom: '10px', marginTop: 0 }}>
                {vraag.tekst}
                {saving === vraag.id && (
                  <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>Opslaan...</span>
                )}
              </p>

              {vraag.type === 'score' && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => !isReadOnly && handleScoreClick(vraag.id, String(score))}
                      disabled={isReadOnly}
                      style={{
                        padding: '8px 12px',
                        border: antwoorden[vraag.id] === String(score) ? '2px solid #eb6608' : '2px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: antwoorden[vraag.id] === String(score) ? '#fff7ed' : '#fff',
                        color: antwoorden[vraag.id] === String(score) ? '#eb6608' : '#374151',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        fontSize: '13px',
                        fontWeight: antwoorden[vraag.id] === String(score) ? 600 : 400,
                        minHeight: '44px',
                        minWidth: '44px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{score}</span>
                      <span style={{ fontSize: '10px' }}>{SCORE_LABELS[score - 1]}</span>
                    </button>
                  ))}
                </div>
              )}

              {vraag.type === 'datum-tijd' && (
                <input
                  type="datetime-local"
                  value={antwoorden[vraag.id] || ''}
                  onChange={(e) => handleChange(vraag.id, e.target.value)}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    backgroundColor: isReadOnly ? '#f9fafb' : '#fff',
                    minHeight: '44px',
                  }}
                />
              )}

              {vraag.type === 'tekst' && (
                <textarea
                  value={antwoorden[vraag.id] || ''}
                  onChange={(e) => handleChange(vraag.id, e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Typ hier..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    backgroundColor: isReadOnly ? '#f9fafb' : '#fff',
                  }}
                />
              )}

              {vraag.type === 'ja-nee' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Ja', 'Nee'].map((optie) => (
                    <button
                      key={optie}
                      onClick={() => !isReadOnly && handleScoreClick(vraag.id, optie)}
                      disabled={isReadOnly}
                      style={{
                        padding: '10px 24px',
                        border: antwoorden[vraag.id] === optie ? '2px solid #eb6608' : '2px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: antwoorden[vraag.id] === optie ? '#fff7ed' : '#fff',
                        color: antwoorden[vraag.id] === optie ? '#eb6608' : '#374151',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        fontSize: '14px',
                        fontWeight: antwoorden[vraag.id] === optie ? 600 : 400,
                        minHeight: '44px',
                      }}
                    >
                      {optie}
                    </button>
                  ))}
                </div>
              )}

              {vraag.type === 'keuze' && vraag.opties && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {vraag.opties.map((optie) => (
                    <button
                      key={optie}
                      onClick={() => !isReadOnly && handleScoreClick(vraag.id, optie)}
                      disabled={isReadOnly}
                      style={{
                        padding: '10px 16px',
                        border: antwoorden[vraag.id] === optie ? '2px solid #eb6608' : '2px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: antwoorden[vraag.id] === optie ? '#fff7ed' : '#fff',
                        color: antwoorden[vraag.id] === optie ? '#eb6608' : '#374151',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        fontSize: '13px',
                        fontWeight: antwoorden[vraag.id] === optie ? 600 : 400,
                        minHeight: '44px',
                      }}
                    >
                      {optie}
                    </button>
                  ))}
                </div>
              )}

              {vraag.type === 'auto-gebruiker' && (
                <p style={{
                  padding: '10px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  margin: 0,
                }}>
                  {user?.email || 'Onbekend'}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
