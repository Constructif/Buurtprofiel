import { useState, useEffect, useRef } from 'react';
import { useGebiedStore } from '../../store/gebiedStore';
import { loadAllGebieden, loadGebiedData } from '../../services/cbs';
import type { Gebied } from '../../types/gebied';
import { logger } from '../../utils/logger';

export function GebiedSearch({ onSelect }: { onSelect?: () => void } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ buurt: true, wijk: true, gemeente: true });
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    allGebieden,
    setAllGebieden,
    setSelectedGebied,
    setGebiedData,
    setGemeenteData,
    isLoadingGebieden,
    setIsLoadingGebieden,
    setIsLoadingData,
    prefetchVoorzieningen,
    selectedJaar,
    selectedGemeenteFilter,
    setSelectedGemeenteFilter,
  } = useGebiedStore();

  // Laad gebieden bij eerste render
  useEffect(() => {
    async function load() {
      if (allGebieden.length > 0) return;
      setIsLoadingGebieden(true);
      try {
        const gebieden = await loadAllGebieden();
        setAllGebieden(gebieden);
      } catch (error) {
        logger.error('Fout bij laden gebieden:', error);
      } finally {
        setIsLoadingGebieden(false);
      }
    }
    load();
  }, [allGebieden.length, setAllGebieden, setIsLoadingGebieden]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Basis gebieden voor counts (rekening houdend met gemeente filter)
  const baseGebieden = selectedGemeenteFilter
    ? allGebieden.filter(g => g.gemeenteCode === selectedGemeenteFilter.code || g.code === selectedGemeenteFilter.code)
    : allGebieden;

  // Filter results
  const filtered = allGebieden.filter((g) => {
    // Gemeente filter (drill-down)
    if (selectedGemeenteFilter) {
      if (g.type === 'gemeente') return false; // Verberg gemeenten wanneer er al een gemeente filter actief is
      if (g.gemeenteCode !== selectedGemeenteFilter.code) return false;
    }

    // Type filter
    if (g.type === 'buurt' && !filters.buurt) return false;
    if (g.type === 'wijk' && !filters.wijk) return false;
    if (g.type === 'gemeente' && !filters.gemeente) return false;

    // Query filter
    if (query) {
      const q = query.toLowerCase();
      return g.naam.toLowerCase().includes(q) || g.code.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    buurt: baseGebieden.filter((g) => g.type === 'buurt').length,
    wijk: baseGebieden.filter((g) => g.type === 'wijk').length,
    gemeente: selectedGemeenteFilter ? 0 : allGebieden.filter((g) => g.type === 'gemeente').length,
  };

  async function handleSelect(gebied: Gebied) {
    // Klik op gemeente = filter instellen + data laden
    if (gebied.type === 'gemeente' && !selectedGemeenteFilter) {
      setSelectedGemeenteFilter(gebied);
      setQuery('');

      // Laad ook gemeente data op de achtergrond
      setSelectedGebied(gebied);
      setIsLoadingData(true);
      try {
        const { gebiedData, gemeenteData } = await loadGebiedData(gebied, selectedJaar);
        setGebiedData(gebiedData);
        setGemeenteData(gemeenteData);
        prefetchVoorzieningen(gebied.code);
      } catch (error) {
        logger.error('Fout bij laden data:', error);
      } finally {
        setIsLoadingData(false);
      }

      // Dropdown open houden zodat gebruiker wijken/buurten kan bekijken
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    // Klik op wijk/buurt (of gemeente wanneer al gefilterd) = normaal selecteren
    setSelectedGebied(gebied);
    setIsOpen(false);
    setQuery('');
    setSelectedGemeenteFilter(null);
    onSelect?.();

    setIsLoadingData(true);
    try {
      const { gebiedData, gemeenteData } = await loadGebiedData(gebied, selectedJaar);
      setGebiedData(gebiedData);
      setGemeenteData(gemeenteData);
      // Start voorzieningen prefetch parallel (fire-and-forget)
      prefetchVoorzieningen(gebied.code);
    } catch (error) {
      logger.error('Fout bij laden data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Search trigger */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        style={{
          width: '100%',
          padding: '10px 16px 10px 40px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '0',
          color: 'white',
          textAlign: 'left',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        <svg
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'rgba(255,255,255,0.6)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Zoek naar een buurt, wijk of gemeente...</span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="search-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            backgroundColor: 'white',
            borderRadius: '0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            zIndex: 50,
            minWidth: 'min(400px, calc(100vw - 32px))'
          }}
        >
          <div className="search-dropdown-content" style={{ padding: '16px' }}>
            {/* Gemeente filter chip */}
            {selectedGemeenteFilter && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#fef3ee',
                border: '1px solid #eb6608',
              }}>
                <span style={{ fontSize: '13px', color: '#374151' }}>
                  Gemeente: <strong style={{ color: '#eb6608' }}>{selectedGemeenteFilter.naam}</strong>
                </span>
                <button
                  onClick={() => {
                    setSelectedGemeenteFilter(null);
                    setQuery('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280',
                    fontSize: '16px',
                    padding: '0 4px',
                    lineHeight: 1,
                  }}
                  title="Filter wissen"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Search input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={selectedGemeenteFilter ? `Zoek binnen ${selectedGemeenteFilter.naam}...` : 'Type een naam of code...'}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '0',
                fontSize: '14px',
                color: '#111827',
                outline: 'none'
              }}
            />

            {/* Type filters */}
            <div className="search-filters" style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
              {(['buurt', 'wijk', 'gemeente'] as const).map((type) => (
                <label
                  key={type}
                  style={{
                    display: selectedGemeenteFilter && type === 'gemeente' ? 'none' : 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filters[type]}
                    onChange={(e) => setFilters({ ...filters, [type]: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#eb6608' }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151', textTransform: 'capitalize' }}>{type}</span>
                  <span className="search-filter-count" style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '0' }}>
                    {counts[type].toLocaleString()}
                  </span>
                </label>
              ))}
            </div>

            {/* Results count */}
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '12px', marginBottom: '8px' }}>
              {isLoadingGebieden ? (
                'Laden...'
              ) : (
                <>Resultaten: <span style={{ fontWeight: 600, color: '#eb6608' }}>{filtered.length.toLocaleString()}</span></>
              )}
            </p>

            {/* Results */}
            <div className="search-results" style={{ maxHeight: '288px', overflowY: 'auto' }}>
              {filtered.slice(0, 50).map((g) => (
                <button
                  key={g.code}
                  onClick={() => handleSelect(g)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    marginBottom: '4px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f1ee'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <p style={{ fontWeight: 500, color: '#111827', margin: 0 }}>{g.naam}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    {selectedGemeenteFilter
                      ? (g.type === 'wijk' ? 'Wijk' : `Buurt${g.wijkNaam ? ` in wijk ${g.wijkNaam}` : ''}`)
                      : (g.type === 'gemeente' ? 'Gemeente' : g.type === 'wijk' ? `Wijk in ${g.gemeenteNaam || 'onbekend'}` : `Buurt in ${g.gemeenteNaam || 'onbekend'}`)
                    }
                  </p>
                </button>
              ))}
              {filtered.length === 0 && !isLoadingGebieden && (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '16px' }}>Geen resultaten gevonden</p>
              )}
            </div>

            {/* Mobile close button */}
            <button
              className="search-close-btn"
              onClick={() => setIsOpen(false)}
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
