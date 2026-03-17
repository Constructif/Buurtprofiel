import { useEffect, useRef } from 'react';
import { Header } from './components/layout/Header';
import { MainTabs } from './components/layout/MainTabs';
import { SubTabs } from './components/layout/SubTabs';
import { useGebiedStore } from './store/gebiedStore';
import { loadGebiedData } from './services/cbs';
import { Overzicht, Bewoners, Wonen, Veiligheid, Voorzieningen, ZorgWelzijn, WerkInkomen, Leefomgeving } from './components/tabs/ruwe-data';
import { EigenOnderzoekPlaceholder } from './components/tabs/eigen-onderzoek/Placeholder';
import { useAuth } from './hooks/useAuth';
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

  const prevJaarRef = useRef(selectedJaar);

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
        if (!cancelled) console.error('Fout bij laden data voor jaar:', error);
      });

    return () => { cancelled = true; };
  }, [selectedJaar, selectedGebied, setGebiedData, setGemeenteData]);

  const renderContent = () => {
    if (mainTab === 'eigen-onderzoek') {
      return <EigenOnderzoekPlaceholder />;
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

  // Tab key voor fade-transitie bij wissel
  const tabKey = mainTab === 'eigen-onderzoek' ? 'eigen-onderzoek' : subTab;

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
