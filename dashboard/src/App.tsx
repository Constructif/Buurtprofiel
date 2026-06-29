import { useEffect, useRef } from 'react';
import { Header } from './components/layout/Header';
import { MainTabs } from './components/layout/MainTabs';
import { SubTabs } from './components/layout/SubTabs';
import { useGebiedStore } from './store/gebiedStore';
import { loadGebiedData } from './services/cbs';
import { Overzicht, Bewoners, Wonen, Veiligheid, Voorzieningen, ZorgWelzijn, WerkInkomen, Leefomgeving } from './components/tabs/ruwe-data';
import { WijkrondeTab } from './components/tabs/wijkronde';
import { NaderOnderzoekTab } from './components/tabs/nader-onderzoek';
import { PresentatieTab } from './components/tabs/presentatie';
import { ProfielTab } from './components/tabs/profiel';
import { useAuth } from './hooks/useAuth';
import { logger } from './utils/logger';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './components/auth/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  useAuth();
  const { session, isLoading: isAuthLoading } = useAuthStore();

  // Granulaire selectors — voorkomt onnodige re-renders
  const mainTab = useGebiedStore(s => s.mainTab);
  const subTab = useGebiedStore(s => s.subTab);
  const selectedJaar = useGebiedStore(s => s.selectedJaar);
  const selectedGebied = useGebiedStore(s => s.selectedGebied);
  const setGebiedData = useGebiedStore(s => s.setGebiedData);
  const setGemeenteData = useGebiedStore(s => s.setGemeenteData);
  const profielOpen = useGebiedStore(s => s.profielOpen);
  const loadFavorieten = useGebiedStore(s => s.loadFavorieten);

  const prevJaarRef = useRef(selectedJaar);

  // Laad favorieten zodra de gebruiker is ingelogd
  useEffect(() => {
    if (session) loadFavorieten();
  }, [session, loadFavorieten]);

  // Refetch data wanneer jaar verandert en er een gebied geselecteerd is
  useEffect(() => {
    if (prevJaarRef.current === selectedJaar) return;
    prevJaarRef.current = selectedJaar;

    if (!selectedGebied) return;

    // Check of data al uit cache kwam (dan is gebiedData al gezet door setSelectedJaar)
    const cacheKey = `${selectedGebied.code}_${selectedJaar}`;
    const cached = useGebiedStore.getState().dataCache.get(cacheKey);
    if (cached) return; // Data al uit cache geladen

    let cancelled = false;
    // Geen setIsLoadingData(true) — bestaande data blijft zichtbaar tijdens laden
    // Dit voorkomt de "blackout" bij jaar-wisseling

    loadGebiedData(selectedGebied, selectedJaar)
      .then(({ gebiedData, gemeenteData }) => {
        if (!cancelled) {
          setGebiedData(gebiedData);
          setGemeenteData(gemeenteData);
        }
      })
      .catch((error) => {
        if (!cancelled) logger.error('Fout bij laden data voor jaar:', error);
      });

    return () => { cancelled = true; };
  }, [selectedJaar, selectedGebied, setGebiedData, setGemeenteData]);

  const renderContent = () => {
    if (mainTab === 'wijkronde') {
      return <WijkrondeTab />;
    }
    if (mainTab === 'nader-onderzoek') {
      return <NaderOnderzoekTab />;
    }
    if (mainTab === 'presentatie') {
      return <PresentatieTab />;
    }

    // Ruwe data tabs
    switch (subTab) {
      case 'overzicht':
        return <Overzicht />;
      case 'bewoners':
        return <Bewoners />;
      case 'wonen':
        return <Wonen />;
      case 'veiligheid':
        return <Veiligheid />;
      case 'voorzieningen':
        return <Voorzieningen />;
      case 'zorg':
        return <ZorgWelzijn />;
      case 'economie':
        return <WerkInkomen />;
      case 'leefomgeving':
        return <Leefomgeving />;
      default:
        return <Overzicht />;
    }
  };

  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f1ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999', fontSize: '14px' }}>Laden...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  // Profiel-weergave: overschrijft het dashboard (zonder gebied-tabs)
  if (profielOpen) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f1ee' }}>
        <Header />
        <main className="main-content" style={{ maxWidth: '1800px', margin: '0 auto', padding: '24px' }}>
          <ErrorBoundary>
            <ProfielTab />
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  // Tab key voor fade-transitie bij wissel
  const tabKey = mainTab !== 'ruwe-data' ? mainTab : subTab;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f1ee' }}>
      <Header />

      <main className="main-content" style={{ maxWidth: '1800px', margin: '0 auto', padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <MainTabs />
          <SubTabs />
        </div>

        <div className="tab-content" key={tabKey} style={{ marginTop: '20px' }}>
          <ErrorBoundary key={tabKey}>
            {renderContent()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
