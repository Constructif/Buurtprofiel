import { useState } from 'react';
import type React from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { BewonersSection } from './sections/BewonersSection';
import { WonenSection } from './sections/WonenSection';
import { VeiligheidSection } from './sections/VeiligheidSection';
import { ZorgWelzijnSection } from './sections/ZorgWelzijnSection';
import { WerkInkomenSection } from './sections/WerkInkomenSection';
import { LeefomgevingSection } from './sections/LeefomgevingSection';
import { VoorzieningenSection, OverzichtKaartSection } from './sections/VoorzieningenSection';

// ─── Thema config ─────────────────────────────────────────────────────────────
const THEMA: Record<string, { label: string; kleur: string; lichtKleur: string }> = {
  overzicht:    { label: 'Overzicht',       kleur: '#b45309', lichtKleur: '#fffbeb' },
  bewoners:     { label: 'Bewoners',         kleur: '#1d4ed8', lichtKleur: '#eff6ff' },
  wonen:        { label: 'Wonen',            kleur: '#15803d', lichtKleur: '#f0fdf4' },
  veiligheid:   { label: 'Veiligheid',       kleur: '#b91c1c', lichtKleur: '#fef2f2' },
  zorg:         { label: 'Zorg & Welzijn',   kleur: '#7c3aed', lichtKleur: '#faf5ff' },
  economie:     { label: 'Werk & Inkomen',   kleur: '#0369a1', lichtKleur: '#f0f9ff' },
  leefomgeving: { label: 'Leefomgeving',     kleur: '#065f46', lichtKleur: '#ecfdf5' },
  voorzieningen:{ label: 'Voorzieningen',    kleur: '#a21caf', lichtKleur: '#fdf4ff' },
  wijkronde:    { label: 'Wijkronde',        kleur: '#c2410c', lichtKleur: '#fff7ed' },
};

// ─── Sectie groottes (12-koloms grid, rijen van 280px) ────────────────────────
const SECTION_SIZES: Record<string, { cols: number; rows: number; label: string }> = {
  'overzicht-kaart':              { cols: 8, rows: 2, label: 'Overzicht Kaart' },
  'overzicht-score':              { cols: 4, rows: 2, label: 'Overzicht Score' },
  'bewoners-demografisch':        { cols: 4, rows: 1, label: 'Demografische Gegevens' },
  'bewoners-leeftijd':            { cols: 6, rows: 2, label: 'Leeftijdsverdeling' },
  'bewoners-herkomst':            { cols: 6, rows: 2, label: 'Herkomst Bevolking' },
  'bewoners-herkomstland':        { cols: 12, rows: 2, label: 'Herkomst per Land' },
  'bewoners-huishoudens':         { cols: 6, rows: 2, label: 'Huishoudenstypen' },
  'wonen-voorraad':               { cols: 4, rows: 1, label: 'Woningvoorraad' },
  'wonen-koophuur':               { cols: 6, rows: 2, label: 'Koop vs Huur' },
  'wonen-woningtypes':            { cols: 6, rows: 2, label: 'Woningtypes' },
  'wonen-huurdetail':             { cols: 4, rows: 1, label: 'Huurwoningen Detail' },
  'wonen-verhuisbewegingen':      { cols: 8, rows: 2, label: 'Verhuisbewegingen' },
  'wonen-corporaties':            { cols: 4, rows: 1, label: 'Woningcorporaties' },
  'veiligheid-score':             { cols: 8, rows: 1, label: 'Veiligheidsscore' },
  'veiligheid-crimtype':          { cols: 6, rows: 2, label: 'Criminaliteit per Type' },
  'veiligheid-trend':             { cols: 6, rows: 2, label: 'Criminaliteit Trend' },
  'veiligheid-cijfers':           { cols: 12, rows: 1, label: 'Criminaliteitscijfers' },
  'veiligheid-vermogen':          { cols: 6, rows: 2, label: 'Vermogensdelicten' },
  'veiligheid-geweld':            { cols: 6, rows: 2, label: 'Geweldsdelicten' },
  'veiligheid-overlast':          { cols: 6, rows: 2, label: 'Overlast & Overig' },
  'veiligheid-verkeer':           { cols: 6, rows: 1, label: 'Verkeer' },
  'zorg-eenzaamheid':             { cols: 8, rows: 2, label: 'Eenzaamheid' },
  'zorg-eenzaamheid-trend':       { cols: 6, rows: 2, label: 'Eenzaamheid Trend' },
  'zorg-mentaal':                 { cols: 6, rows: 2, label: 'Mentale Gezondheid' },
  'zorg-ondersteuning':           { cols: 8, rows: 2, label: 'Zorg & Ondersteuning' },
  'economie-inkomen':             { cols: 8, rows: 2, label: 'Inkomen' },
  'economie-opleiding':           { cols: 6, rows: 2, label: 'Opleidingsniveau' },
  'economie-werk':                { cols: 6, rows: 2, label: 'Werkgelegenheid' },
  'economie-uitkeringen':         { cols: 6, rows: 2, label: 'Uitkeringen' },
  'leefomgeving-groen':           { cols: 8, rows: 2, label: 'Groenvoorzieningen' },
  'leefomgeving-bodem-verdeling': { cols: 6, rows: 2, label: 'Verdeling Groengebieden' },
  'leefomgeving-bodem-detail':    { cols: 6, rows: 2, label: 'Groengebieden per Type' },
  'leefomgeving-vergelijking':    { cols: 8, rows: 2, label: 'Vergelijking Groen' },
  'voorzieningen-kaart':          { cols: 8, rows: 3, label: 'Voorzieningenkaart' },
  'voorzieningen-lijst':          { cols: 4, rows: 3, label: 'Voorzieningenlijst' },
  'wijkronde-vragen-algemene-gegevens':                          { cols: 6, rows: 2, label: 'Vragen: Algemene gegevens' },
  'wijkronde-vragen-straat-en-openbare-ruimte':                  { cols: 6, rows: 2, label: 'Vragen: Straat & Openbare ruimte' },
  'wijkronde-vragen-verlichting':                                { cols: 6, rows: 2, label: 'Vragen: Verlichting' },
  'wijkronde-vragen-groen-en-buitenruimte':                      { cols: 6, rows: 2, label: 'Vragen: Groen & Buitenruimte' },
  'wijkronde-vragen-voorzieningen-in/nabij-de-wijk':             { cols: 8, rows: 2, label: 'Vragen: Voorzieningen' },
  'wijkronde-vragen-sociale-cohesie-en-gebruik-openbare-ruimte': { cols: 8, rows: 2, label: 'Vragen: Sociale Cohesie' },
  'wijkronde-vragen-sociale-veiligheid':                         { cols: 6, rows: 2, label: 'Vragen: Sociale Veiligheid' },
  'wijkronde-vragen-wonen-en-woninggebruik':                     { cols: 6, rows: 2, label: 'Vragen: Wonen' },
  'wijkronde-vragen-bereikbaarheid':                             { cols: 6, rows: 2, label: 'Vragen: Bereikbaarheid' },
  'wijkronde-vragen-verkeerssituatie':                           { cols: 6, rows: 2, label: 'Vragen: Verkeerssituatie' },
  'wijkronde-vragen-parkeren':                                   { cols: 6, rows: 2, label: 'Vragen: Parkeren' },
  'wijkronde-vragen-overzicht-en-zichtlijnen':                   { cols: 6, rows: 2, label: 'Vragen: Zichtlijnen' },
  'wijkronde-vragen-signalen':                                   { cols: 6, rows: 2, label: 'Vragen: Signalen' },
  'wijkronde-vragen-reflectie-&-kansen':                         { cols: 8, rows: 2, label: 'Vragen: Reflectie & Kansen' },
  'wijkronde-vragen-algemene-indruk-en-bijzonderheden':          { cols: 8, rows: 2, label: 'Vragen: Algemene Indruk' },
  'wijkronde-observatie-kaart':   { cols: 8, rows: 3, label: 'Observatiekaart' },
  'wijkronde-observatie-lijst':   { cols: 4, rows: 3, label: 'Observatielijst' },
};
const DEFAULT_SIZE = { cols: 6, rows: 2, label: 'Sectie' };

// ─── Layout types ─────────────────────────────────────────────────────────────
type LayoutMode = 'bento' | 'compact' | 'breed';

const LAYOUTS: { id: LayoutMode; label: string; desc: string }[] = [
  { id: 'compact', label: 'Compact', desc: 'Gelijke tegels' },
  { id: 'bento',   label: 'Bento',   desc: 'Dynamisch raster' },
  { id: 'breed',   label: 'Rapport', desc: 'Breed & lineair' },
];

// ─── Content renderer ─────────────────────────────────────────────────────────
function renderSection(sectionId: string): React.ReactNode {
  const prefix = sectionId.split('-')[0];
  if (prefix === 'bewoners')     return <BewonersSection sectionId={sectionId} />;
  if (prefix === 'wonen')        return <WonenSection sectionId={sectionId} />;
  if (prefix === 'veiligheid')   return <VeiligheidSection sectionId={sectionId} />;
  if (prefix === 'zorg')         return <ZorgWelzijnSection sectionId={sectionId} />;
  if (prefix === 'economie')     return <WerkInkomenSection sectionId={sectionId} />;
  if (prefix === 'leefomgeving') return <LeefomgevingSection sectionId={sectionId} />;
  if (prefix === 'voorzieningen') return <VoorzieningenSection sectionId={sectionId} />;
  if (sectionId === 'overzicht-kaart') return <OverzichtKaartSection />;
  return null;
}

// ─── Kaart cel component ──────────────────────────────────────────────────────
interface KaartCelProps {
  sectionId: string;
  label: string;
  thema: typeof THEMA[string];
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  style?: React.CSSProperties;
  isMapSectie?: boolean;
}

function KaartCel({
  sectionId, label, thema, isFirst, isLast,
  onUp, onDown, onRemove,
  style, isMapSectie,
}: KaartCelProps) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
      border: `1px solid ${thema.kleur}22`,
      transition: 'box-shadow 0.2s',
      ...style,
    }}>
      {/* Thema-header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 10px 16px',
        backgroundColor: thema.lichtKleur,
        borderBottom: `2px solid ${thema.kleur}30`,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: thema.kleur, lineHeight: 1, marginBottom: '2px' }}>
            {thema.label}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{label}</div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {!isFirst && <CtrlBtn onClick={onUp} title="Omhoog"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg></CtrlBtn>}
          {!isLast  && <CtrlBtn onClick={onDown} title="Omlaag"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg></CtrlBtn>}
          <CtrlBtn onClick={onRemove} title="Verwijderen" danger>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </CtrlBtn>
        </div>
      </div>

      {/* Content — flex:1 zodat het de rest van de kaarthoogte vult */}
      <div style={{ flex: 1, minHeight: 0, overflow: isMapSectie ? 'hidden' : 'auto', position: 'relative' }}>
        {renderSection(sectionId) ?? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            Nog niet beschikbaar in presentatie
          </div>
        )}
      </div>
    </div>
  );
}

function CtrlBtn({ onClick, title, danger, color, children }: {
  onClick: () => void; title: string; danger?: boolean; color?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '24px', height: '24px', border: 'none', borderRadius: '6px',
        backgroundColor: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? '#ef4444' : color ?? '#9ca3af',
        padding: 0,
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = danger ? '#fee2e2' : '#f3f4f6'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─── Hoofd component ──────────────────────────────────────────────────────────
export function PresentatieTab() {
  const {
    selectedGebied,
    getPresentatieSelecties,
    clearPresentatieSelecties,
    movePresentatieSelectie,
    togglePresentatieSelectie,
    setMainTab,
    setSelectieModus,
  } = useGebiedStore();

  const [layout, setLayout] = useState<LayoutMode>('compact');

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om een presentatie samen te stellen</p>
      </div>
    );
  }

  const gebiedCode = selectedGebied.code;
  const selecties = getPresentatieSelecties(gebiedCode);

  const goSelectie = () => { setMainTab('ruwe-data'); setSelectieModus(true); };
  const handleLayoutChange = (l: LayoutMode) => { setLayout(l); };;

  const getThema = (sectionId: string) => THEMA[sectionId.split('-')[0]] ?? THEMA.overzicht;
  const isMapSectie = (id: string) => id.includes('-kaart') || id.includes('-observatie-kaart');

  // ── Lege staat ──────────────────────────────────────────────────────────────
  if (selecties.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <PresentatieHeader naam={selectedGebied.naam} count={0} layout={layout} onLayoutChange={handleLayoutChange} onSelectie={goSelectie} onWissen={() => clearPresentatieSelecties(gebiedCode)} />
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 20px', backgroundColor: 'white', borderRadius: '16px',
          border: '2px dashed #e5e7eb', textAlign: 'center',
        }}>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Nog geen secties geselecteerd</p>
          <p style={{ fontSize: '14px', color: '#6b7280', maxWidth: '400px', marginBottom: '28px' }}>
            Ga naar Ruwe Data, zet selectiemodus aan en klik op het bladwijzer-icoon op kaarten die je wilt presenteren.
          </p>
          <button onClick={goSelectie} style={{
            padding: '12px 28px', fontSize: '14px', fontWeight: 700, border: 'none',
            borderRadius: '10px', backgroundColor: '#eb6608', color: 'white', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(235,102,8,0.35)',
          }}>
            Secties selecteren
          </button>
        </div>
      </div>
    );
  }

  // ── Grid layouts ─────────────────────────────────────────────────────────────
  const gridConfig: Record<LayoutMode, React.CSSProperties> = {
    bento: {
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gridAutoRows: 'minmax(280px, auto)',
      gap: '16px',
    },
    compact: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '14px',
    },
    breed: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PresentatieHeader
        naam={selectedGebied.naam}
        count={selecties.length}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        onSelectie={goSelectie}
        onWissen={() => clearPresentatieSelecties(gebiedCode)}
      />

      <div style={gridConfig[layout]}>
        {selecties.map((sectionId, index) => {
          const size = SECTION_SIZES[sectionId] ?? DEFAULT_SIZE;
          const thema = getThema(sectionId);
          const isMap = isMapSectie(sectionId);

          // Elke layout geeft een expliciete hoogte mee zodat flex:1 in KaartCel werkt
          const contentHeight = isMap ? 480 : size.rows * 260;
          const celStyle: React.CSSProperties = layout === 'bento' ? {
            gridColumn: `span ${size.cols}`,
            gridRow: `span ${size.rows}`,
            height: `${size.rows * 280}px`,
          } : layout === 'breed' ? {
            height: `${contentHeight + 48}px`,
          } : {
            height: `${contentHeight + 48}px`,
          };

          return (
            <KaartCel
              key={`${sectionId}-${layout}`}
              sectionId={sectionId}
              label={size.label}
              thema={thema}
              isFirst={index === 0}
              isLast={index === selecties.length - 1}
              onUp={() => movePresentatieSelectie(gebiedCode, sectionId, 'up')}
              onDown={() => movePresentatieSelectie(gebiedCode, sectionId, 'down')}
              onRemove={() => togglePresentatieSelectie(gebiedCode, sectionId)}
              isMapSectie={isMap}
              style={celStyle}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Header component ─────────────────────────────────────────────────────────
function PresentatieHeader({ naam, count, layout, onLayoutChange, onSelectie, onWissen }: {
  naam: string; count: number; layout: LayoutMode; onLayoutChange: (l: LayoutMode) => void;
  onSelectie: () => void; onWissen: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '12px',
      padding: '14px 20px',
      backgroundColor: 'white', borderRadius: '14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid #f3f4f6',
    }}>
      {/* Links: titel + teller */}
      <div>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
          {naam}
          <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px', fontSize: '15px' }}>— Presentatie</span>
        </h2>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>
          {count === 0 ? 'Geen secties geselecteerd' : `${count} ${count === 1 ? 'sectie' : 'secties'}`}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Layout switcher */}
        <div style={{
          display: 'flex', backgroundColor: '#f9fafb', borderRadius: '10px',
          padding: '3px', border: '1px solid #e5e7eb', gap: '2px',
        }}>
          {LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => onLayoutChange(l.id)}
              title={l.desc}
              style={{
                padding: '5px 12px', border: 'none', borderRadius: '7px', cursor: 'pointer',
                fontSize: '11px', fontWeight: 600,
                backgroundColor: layout === l.id ? 'white' : 'transparent',
                color: layout === l.id ? '#111827' : '#9ca3af',
                boxShadow: layout === l.id ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Acties */}
        <button onClick={onSelectie} style={{
          padding: '8px 14px', fontSize: '12px', fontWeight: 700,
          border: '2px solid #eb6608', borderRadius: '9px',
          backgroundColor: 'white', color: '#eb6608', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Selectie aanpassen
        </button>
        {count > 0 && (
          <button onClick={onWissen} style={{
            padding: '8px 12px', fontSize: '12px', fontWeight: 500,
            border: '1px solid #e5e7eb', borderRadius: '9px',
            backgroundColor: 'white', color: '#9ca3af', cursor: 'pointer',
          }}>
            Wissen
          </button>
        )}
      </div>
    </div>
  );
}
