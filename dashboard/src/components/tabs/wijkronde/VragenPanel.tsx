import { useState, useEffect, useCallback, useRef } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { useAuthStore } from '../../../store/authStore';
import { wijkrondeVragen, categorieNummer } from '../../../data/wijkrondeVragen';
import { fetchAntwoorden, upsertAntwoord, vragenOpslaan, vragenHeropenen } from '../../../services/wijkronde';
import { logger } from '../../../utils/logger';
import type { WijkrondeAntwoord } from '../../../types/wijkronde';
import { VragenOverzicht } from './VragenOverzicht';
import { SelectableWrapper } from '../../ui/SelectableCard';

const SCORE_LABELS = ['Slecht', 'Matig', 'Voldoende', 'Goed', 'Uitstekend'];

export function VragenPanel() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const actieveRonde = useGebiedStore((s) => s.actieveRonde);
  const setActieveRonde = useGebiedStore((s) => s.setActieveRonde);
  const user = useAuthStore((s) => s.user);

  const [antwoorden, setAntwoorden] = useState<Record<string, string>>({});
  const [notities, setNotities] = useState<Record<string, string>>({});
  const [openNotities, setOpenNotities] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [observatorInput, setObservatorInput] = useState('');
  const [opslaanBezig, setOpslaanBezig] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Actuele waarden voor de (gedebouncede) opslag, zodat antwoord en notitie
  // samen worden weggeschreven zonder elkaars veld te overschrijven.
  const antwoordenRef = useRef<Record<string, string>>({});
  const notitiesRef = useRef<Record<string, string>>({});
  antwoordenRef.current = antwoorden;
  notitiesRef.current = notities;

  const isOpgeslagen = !!actieveRonde?.vragen_opgeslagen;
  const isReadOnly = isOpgeslagen;

  const loadAntwoorden = useCallback(async () => {
    if (!actieveRonde) return;
    setLoading(true);
    try {
      const data = await fetchAntwoorden(actieveRonde.id);
      const map: Record<string, string> = {};
      const notitieMap: Record<string, string> = {};
      data.forEach((a: WijkrondeAntwoord) => {
        map[a.vraag_id] = a.antwoord;
        if (a.notitie) notitieMap[a.vraag_id] = a.notitie;
      });
      setAntwoorden(map);
      setNotities(notitieMap);
    } catch (error) {
      logger.error('Fout bij laden antwoorden:', error);
    } finally {
      setLoading(false);
    }
  }, [actieveRonde]);

  useEffect(() => {
    loadAntwoorden();
  }, [loadAntwoorden]);

  // Observator voorvullen: eerder vastgelegde naam, anders ingelogde gebruiker
  useEffect(() => {
    setObservatorInput(actieveRonde?.vragen_observator ?? user?.email ?? '');
  }, [actieveRonde, user]);

  // Cleanup timers
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Schrijf antwoord én notitie van dezelfde vraag samen weg, zodat een upsert
  // het andere veld niet leegt. Leest de actuele waarden uit de refs.
  const persist = useCallback(async (vraagId: string) => {
    if (!actieveRonde || !selectedGebied) return;

    setSaving(vraagId);
    try {
      await upsertAntwoord({
        buurtcode: selectedGebied.code,
        ronde_id: actieveRonde.id,
        vraag_id: vraagId,
        antwoord: antwoordenRef.current[vraagId] ?? '',
        notitie: notitiesRef.current[vraagId] || null,
      });
    } catch (error) {
      logger.error('Fout bij opslaan antwoord:', error);
    } finally {
      setSaving(null);
    }
  }, [actieveRonde, selectedGebied]);

  const debouncedPersist = (vraagId: string) => {
    if (debounceTimers.current[vraagId]) {
      clearTimeout(debounceTimers.current[vraagId]);
    }
    debounceTimers.current[vraagId] = setTimeout(() => {
      persist(vraagId);
    }, 800);
  };

  const handleChange = (vraagId: string, value: string) => {
    setAntwoorden((prev) => ({ ...prev, [vraagId]: value }));
    antwoordenRef.current = { ...antwoordenRef.current, [vraagId]: value };
    debouncedPersist(vraagId);
  };

  const handleScoreClick = (vraagId: string, score: string) => {
    setAntwoorden((prev) => ({ ...prev, [vraagId]: score }));
    antwoordenRef.current = { ...antwoordenRef.current, [vraagId]: score };
    persist(vraagId);
  };

  const handleNotitieChange = (vraagId: string, value: string) => {
    setNotities((prev) => ({ ...prev, [vraagId]: value }));
    notitiesRef.current = { ...notitiesRef.current, [vraagId]: value };
    debouncedPersist(vraagId);
  };

  const handleOpslaan = async () => {
    if (!actieveRonde || !observatorInput.trim()) return;
    setOpslaanBezig(true);
    try {
      setActieveRonde(await vragenOpslaan(actieveRonde.id, observatorInput.trim()));
    } catch (error) {
      logger.error('Fout bij opslaan vragenlijst:', error);
    } finally {
      setOpslaanBezig(false);
    }
  };

  const handleAanpassen = async () => {
    if (!actieveRonde) return;
    try {
      setActieveRonde(await vragenHeropenen(actieveRonde.id));
    } catch (error) {
      logger.error('Fout bij heropenen vragenlijst:', error);
    }
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

  // Opgeslagen → toon read-only overzicht met aanpasknop
  if (isOpgeslagen) {
    return (
      <VragenOverzicht
        antwoorden={antwoorden}
        notities={notities}
        observator={actieveRonde.vragen_observator ?? ''}
        opgeslagenAt={actieveRonde.vragen_opgeslagen_at}
        onAanpassen={handleAanpassen}
      />
    );
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
        <SelectableWrapper
          key={categorie}
          sectionId={`wijkronde-vragen-${categorie.toLowerCase().replace(/\s+/g, '-')}`}
          style={{ marginBottom: '24px' }}
        >
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
            {categorieNummer[categorie]}. {categorie}
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

              {/* Eigen notitie bij multiple-choice-vragen */}
              {(vraag.type === 'ja-nee' || vraag.type === 'score' || vraag.type === 'keuze') && (() => {
                // Standaard open als er al een notitie is, tenzij de gebruiker
                // hem expliciet heeft ingeklapt (openNotities[id] === false).
                const heeftNotitie = !!notities[vraag.id];
                const toggle = openNotities[vraag.id];
                const open = toggle ?? heeftNotitie;
                return (
                  <div style={{ marginTop: '10px' }}>
                    {!open ? (
                      <button
                        onClick={() => !isReadOnly && setOpenNotities((prev) => ({ ...prev, [vraag.id]: true }))}
                        disabled={isReadOnly}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 0',
                          border: 'none',
                          background: 'none',
                          color: '#eb6608',
                          cursor: isReadOnly ? 'default' : 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span> Notitie
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <textarea
                          value={notities[vraag.id] || ''}
                          onChange={(e) => handleNotitieChange(vraag.id, e.target.value)}
                          disabled={isReadOnly}
                          placeholder="Eigen notitie..."
                          rows={2}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: '8px 10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            backgroundColor: isReadOnly ? '#f9fafb' : '#fff',
                          }}
                        />
                        {!isReadOnly && (
                          <button
                            onClick={() => setOpenNotities((prev) => ({ ...prev, [vraag.id]: false }))}
                            title="Notitie inklappen"
                            style={{
                              flexShrink: 0,
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              background: 'none',
                              color: '#9ca3af',
                              cursor: 'pointer',
                              fontSize: '18px',
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
        </SelectableWrapper>
      ))}

      {/* Vragenlijst afsluiten */}
      <div style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginTop: '8px',
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1b', margin: '0 0 4px' }}>
          Vragenlijst afsluiten
        </h4>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
          Leg de observator vast en sla de vragenlijst op. Observaties kun je daarna nog steeds toevoegen.
        </p>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
          Observator
        </label>
        <input
          type="text"
          value={observatorInput}
          onChange={(e) => setObservatorInput(e.target.value)}
          placeholder="Naam observator"
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
            minHeight: '44px',
            marginBottom: '12px',
          }}
        />

        <div>
          <button
            onClick={handleOpslaan}
            disabled={opslaanBezig || !observatorInput.trim()}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              backgroundColor: opslaanBezig || !observatorInput.trim() ? '#f3a672' : '#eb6608',
              color: '#fff',
              cursor: opslaanBezig || !observatorInput.trim() ? 'default' : 'pointer',
              minHeight: '44px',
            }}
          >
            {opslaanBezig ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
