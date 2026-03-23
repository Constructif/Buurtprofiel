import { useState, useEffect, useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { fetchRondesForBuurt, createRonde, deleteRonde } from '../../../services/wijkronde';
import type { Wijkronde } from '../../../types/wijkronde';

export function RondeSelector() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const actieveRonde = useGebiedStore((s) => s.actieveRonde);
  const setActieveRonde = useGebiedStore((s) => s.setActieveRonde);

  const [rondes, setRondes] = useState<Wijkronde[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadRondes = useCallback(async () => {
    if (!selectedGebied) return;
    setLoading(true);
    try {
      const data = await fetchRondesForBuurt(selectedGebied.code);
      setRondes(data);
      // Selecteer meest recente als er nog niks geselecteerd is
      if (!actieveRonde || !data.find((r) => r.id === actieveRonde.id)) {
        setActieveRonde(data[0] || null);
      }
    } catch (error) {
      console.error('Fout bij laden rondes:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGebied, actieveRonde, setActieveRonde]);

  useEffect(() => {
    loadRondes();
  }, [loadRondes]);

  const handleNieuweRonde = async () => {
    if (!selectedGebied) return;
    setCreating(true);
    try {
      const ronde = await createRonde(selectedGebied.code, selectedGebied.naam);
      setActieveRonde(ronde);
      await loadRondes();
    } catch (error) {
      console.error('Fout bij aanmaken ronde:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRonde = async (rondeId: string) => {
    setDeleting(rondeId);
    try {
      await deleteRonde(rondeId);
      setConfirmDelete(null);
      if (actieveRonde?.id === rondeId) {
        setActieveRonde(null);
      }
      await loadRondes();
    } catch (error) {
      console.error('Fout bij verwijderen ronde:', error);
    } finally {
      setDeleting(null);
    }
  };

  if (!selectedGebied) return null;

  if (loading) {
    return <p style={{ color: '#9ca3af', fontSize: '13px' }}>Rondes laden...</p>;
  }

  // Geen rondes → toon alleen "Nieuwe ronde" knop
  if (rondes.length === 0) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '16px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px', marginTop: 0 }}>
          Er zijn nog geen wijkrondes voor deze buurt.
        </p>
        <button
          onClick={handleNieuweRonde}
          disabled={creating}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#eb6608',
            color: '#fff',
            cursor: creating ? 'default' : 'pointer',
            minHeight: '44px',
          }}
        >
          {creating ? 'Aanmaken...' : 'Nieuwe ronde starten'}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      marginBottom: '16px',
    }}>
      {/* Header met "Nieuwe ronde" knop */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1b', margin: 0 }}>
          Wijkrondes
        </h3>
        <button
          onClick={handleNieuweRonde}
          disabled={creating}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#eb6608',
            color: '#fff',
            cursor: creating ? 'default' : 'pointer',
            minHeight: '32px',
          }}
        >
          {creating ? 'Aanmaken...' : '+ Nieuwe ronde'}
        </button>
      </div>

      {/* Lijst van alle rondes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rondes.map((ronde) => {
          const isSelected = actieveRonde?.id === ronde.id;
          return (
            <div
              key={ronde.id}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <button
                onClick={() => setActieveRonde(ronde)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: isSelected ? '#fff7ed' : '#f9fafb',
                  border: isSelected ? '2px solid #eb6608' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  flex: 1,
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: '#1d1d1b' }}>
                    {new Date(ronde.started_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {ronde.aantal_observaties} obs.
                </span>
              </button>

              {/* Verwijderknop */}
              {confirmDelete === ronde.id ? (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleDeleteRonde(ronde.id)}
                    disabled={deleting === ronde.id}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#c0392b',
                      color: '#fff',
                      cursor: deleting === ronde.id ? 'default' : 'pointer',
                      minHeight: '32px',
                    }}
                  >
                    {deleting === ronde.id ? '...' : 'Ja'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      minHeight: '32px',
                    }}
                  >
                    Nee
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(ronde.id)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    border: '1px solid #e5c7c4',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    color: '#c0392b',
                    cursor: 'pointer',
                    minHeight: '32px',
                    flexShrink: 0,
                  }}
                >
                  X
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
