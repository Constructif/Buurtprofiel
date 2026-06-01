import { useState } from 'react';
import { wijkrondeVragen, categorieNummer } from '../../../data/wijkrondeVragen';

interface VragenOverzichtProps {
  antwoorden: Record<string, string>;
  notities: Record<string, string>;
  observator: string;
  opgeslagenAt: string | null;
  onAanpassen: () => void;
}

const SCORE_LABELS = ['Slecht', 'Matig', 'Voldoende', 'Goed', 'Uitstekend'];

/** Formatteer een antwoord naar leesbare tekst per vraagtype. */
function formatAntwoord(type: string, waarde: string): string {
  if (type === 'score') {
    const n = Number(waarde);
    const label = SCORE_LABELS[n - 1];
    return label ? `${n} – ${label}` : waarde;
  }
  if (type === 'datum-tijd') {
    const d = new Date(waarde);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short' });
    }
    return waarde;
  }
  return waarde;
}

export function VragenOverzicht({ antwoorden, notities, observator, opgeslagenAt, onAanpassen }: VragenOverzichtProps) {
  const [open, setOpen] = useState(false);

  // Groepeer vragen per categorie: tonen zodra er een antwoord óf een notitie is
  // (niet de auto-gebruiker-vraag).
  const categorieGroepen = wijkrondeVragen.reduce<Record<string, typeof wijkrondeVragen>>((acc, vraag) => {
    if (vraag.type === 'auto-gebruiker') return acc;
    const waarde = antwoorden[vraag.id];
    const heeftAntwoord = waarde !== undefined && waarde !== '';
    const heeftNotitie = !!notities[vraag.id];
    if (!heeftAntwoord && !heeftNotitie) return acc;
    if (!acc[vraag.categorie]) acc[vraag.categorie] = [];
    acc[vraag.categorie].push(vraag);
    return acc;
  }, {});

  const datumLabel = opgeslagenAt
    ? new Date(opgeslagenAt).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short' })
    : null;

  return (
    <div style={{ maxWidth: '700px' }}>
      {/* Header-balk: klik om in/uit te klappen */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: open ? '#fff7ed' : '#fff',
        border: open ? '2px solid #eb6608' : '1px solid #e5e7eb',
        borderRadius: '10px',
        marginBottom: open ? '14px' : 0,
      }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            minWidth: 0,
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: '36px',
          }}
        >
          <span style={{
            fontSize: '12px',
            color: '#eb6608',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
            display: 'inline-block',
          }}>
            ▶
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {observator || 'Onbekende observator'}
            {datumLabel && (
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
                · {datumLabel}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={onAanpassen}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#eb6608',
            color: '#fff',
            cursor: 'pointer',
            minHeight: '36px',
          }}
        >
          Aanpassen
        </button>
      </div>

      {!open ? null : Object.keys(categorieGroepen).length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
          Er zijn nog geen vragen ingevuld.
        </p>
      ) : (
        Object.entries(categorieGroepen).map(([categorie, vragen]) => (
          <div key={categorie} style={{ marginBottom: '14px' }}>
            <h4 style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#1d1d1b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
              paddingBottom: '4px',
              borderBottom: '1px solid #e5e7eb',
            }}>
              {categorieNummer[categorie]}. {categorie}
            </h4>

            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              {vragen.map((vraag, i) => (
                <div
                  key={vraag.id}
                  style={{
                    padding: '7px 12px',
                    borderTop: i === 0 ? 'none' : '1px solid #f3f4f6',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ flex: '1 1 0', fontSize: '13px', color: '#6b7280', minWidth: 0 }}>
                      {vraag.tekst}
                    </span>
                    <span style={{ flex: '1 1 0', fontSize: '13px', fontWeight: 500, color: '#1d1d1b', minWidth: 0, whiteSpace: 'pre-wrap', textAlign: 'right' }}>
                      {antwoorden[vraag.id] ? formatAntwoord(vraag.type, antwoorden[vraag.id]) : ''}
                    </span>
                  </div>
                  {notities[vraag.id] && (
                    <p style={{
                      margin: '4px 0 0',
                      marginLeft: 'auto',
                      maxWidth: '50%',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      fontWeight: 500,
                      color: '#c2410c',
                      whiteSpace: 'pre-wrap',
                      textAlign: 'right',
                    }}>
                      {notities[vraag.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
