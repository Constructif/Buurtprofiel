import { Header } from './components/layout/Header';
import { MainTabs } from './components/layout/MainTabs';
import { SubTabs } from './components/layout/SubTabs';
import { useGebiedStore } from './store/gebiedStore';
import { Overzicht, Bewoners, Wonen, Veiligheid } from './components/tabs/ruwe-data';
import { EigenOnderzoekPlaceholder } from './components/tabs/eigen-onderzoek/Placeholder';

function App() {
  const { mainTab, subTab } = useGebiedStore();

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
        return <PlaceholderTab name="Voorzieningen" />;
      case 'zorg':
        return <PlaceholderTab name="Zorg & Welzijn" />;
      case 'economie':
        return <PlaceholderTab name="Werk & Inkomen" />;
      case 'leefomgeving':
        return <PlaceholderTab name="Leefomgeving" />;
      default:
        return <Overzicht />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f1ee' }}>
      <Header />

      <main className="main-content" style={{ maxWidth: '1800px', margin: '0 auto', padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <MainTabs />
          <SubTabs />
        </div>

        <div style={{ marginTop: '20px' }}>{renderContent()}</div>
      </main>
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1d1d1b', marginBottom: '8px' }}>{name}</h2>
      <p style={{ color: '#6b7280' }}>Deze tab wordt later uitgebreid.</p>
    </div>
  );
}

export default App;
