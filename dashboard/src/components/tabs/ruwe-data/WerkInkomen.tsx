import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';

function formatNumber(num: number): string {
  return num.toLocaleString('nl-NL');
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Nederlands gemiddelde ter vergelijking
const NL_GEMIDDELD_INKOMEN = 27000;

const COLORS = {
  laag: '#ef4444',    // Rood
  midden: '#6b7280',  // Grijs
  hoog: '#22c55e',    // Groen
  oranje: '#eb6608',
};

export function WerkInkomen() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om werk & inkomen data te bekijken</p>
      </div>
    );
  }

  if (isLoadingData || !gebiedData) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #eb6608', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280' }}>Data laden...</p>
      </div>
    );
  }

  const { inkomen, bevolking, kerncijfersJaar } = gebiedData;

  // Inkomensverdeling data
  const middenInkomenPercentage = Math.max(0, 100 - (inkomen.laagInkomenPercentage || 0) - (inkomen.hoogInkomenPercentage || 0));
  const inkomenVerdelingData = [
    { name: 'Laag inkomen', value: inkomen.laagInkomenPercentage || 0, color: COLORS.laag },
    { name: 'Midden inkomen', value: middenInkomenPercentage, color: COLORS.midden },
    { name: 'Hoog inkomen', value: inkomen.hoogInkomenPercentage || 0, color: COLORS.hoog },
  ].filter(item => item.value > 0);

  // Uitkeringen data
  const uitkeringenData = [
    { name: 'Bijstand', value: inkomen.bijstandAantal, label: 'Bijstand' },
    { name: 'WW', value: inkomen.wwAantal, label: 'Werkloosheid' },
    { name: 'AO', value: inkomen.aoAantal, label: 'Arbeidsongeschikt' },
    { name: 'AOW', value: inkomen.aowAantal, label: 'Ouderdom (AOW)' },
  ];

  const hasUitkeringenData = uitkeringenData.some(item => item.value !== null && item.value > 0);

  // Bereken per 1000 inwoners
  const per1000 = (aantal: number | null) => {
    if (aantal === null || bevolking.totaal === 0) return null;
    return Math.round((aantal / bevolking.totaal) * 1000 * 10) / 10;
  };

  // Verschil met NL gemiddelde
  const inkomenVerschil = inkomen.gemiddeld - NL_GEMIDDELD_INKOMEN;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Inkomen */}
      <Card title="Inkomen" badge="data" year={kerncijfersJaar}>
        <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Gemiddeld besteedbaar inkomen</span>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
              {formatCurrency(inkomen.gemiddeld)}
            </p>
            <span style={{
              fontSize: '14px',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: inkomenVerschil >= 0 ? '#dcfce7' : '#fee2e2',
              color: inkomenVerschil >= 0 ? '#15803d' : '#dc2626',
            }}>
              {inkomenVerschil >= 0 ? '+' : ''}{formatCurrency(inkomenVerschil)} t.o.v. NL
            </span>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Laag inkomen</span>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0', color: COLORS.laag }}>
              {Math.round(inkomen.laagInkomenPercentage)}%
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Midden inkomen</span>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0', color: COLORS.midden }}>
              {Math.round(middenInkomenPercentage)}%
            </p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Hoog inkomen</span>
            <p style={{ fontSize: '28px', fontWeight: 600, margin: '4px 0', color: COLORS.hoog }}>
              {Math.round(inkomen.hoogInkomenPercentage)}%
            </p>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
          Inkomensverdeling huishoudens
        </p>
        <div style={{ height: '60px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
          {inkomenVerdelingData.map((item) => (
            <div
              key={item.name}
              style={{
                width: `${item.value}%`,
                backgroundColor: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
                minWidth: item.value > 5 ? 'auto' : '0',
              }}
            >
              {item.value > 10 && `${Math.round(item.value)}%`}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
          {inkomenVerdelingData.map((item) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.name}: {Math.round(item.value)}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Opleidingsniveau - Niet beschikbaar */}
      <Card title="Opleidingsniveau" badge="info" badgeText="Niet beschikbaar">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
          <p style={{ fontWeight: 500, marginBottom: '8px' }}>Opleidingsdata niet beschikbaar</p>
          <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
            CBS publiceert geen opleidingsniveau gegevens op buurt-, wijk- of gemeenteniveau in de Kerncijfers Wijken en Buurten dataset.
          </p>
        </div>
      </Card>

      {/* Arbeidsparticipatie - Niet beschikbaar */}
      <Card title="Arbeidsparticipatie" badge="info" badgeText="Niet beschikbaar">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p style={{ fontWeight: 500, marginBottom: '8px' }}>Arbeidsparticipatiedata niet beschikbaar</p>
          <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
            CBS publiceert geen arbeidsparticipatie gegevens op buurt-, wijk- of gemeenteniveau in de Kerncijfers Wijken en Buurten dataset.
          </p>
        </div>
      </Card>

      {/* Uitkeringen */}
      <Card title="Uitkeringen" badge={hasUitkeringenData ? "data" : "placeholder"} year={hasUitkeringenData ? kerncijfersJaar : undefined}>
        {hasUitkeringenData ? (
          <>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              Aantal personen met uitkering (per 31 december)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {uitkeringenData.map((item) => {
                const perDuizend = per1000(item.value);
                return (
                  <div
                    key={item.name}
                    style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${item.value !== null && item.value > 0 ? COLORS.oranje : '#e5e7eb'}`,
                    }}
                  >
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{item.label}</p>
                    {item.value !== null ? (
                      <>
                        <p style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px 0' }}>
                          {formatNumber(item.value)}
                        </p>
                        {perDuizend !== null && (
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>
                            {perDuizend} per 1.000 inwoners
                          </p>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: '14px', color: '#9ca3af' }}>Geen data</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totaal overzicht */}
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Totaal uitkeringsontvangers (excl. AOW)</span>
                  <p style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0' }}>
                    {formatNumber(
                      (inkomen.bijstandAantal || 0) +
                      (inkomen.wwAantal || 0) +
                      (inkomen.aoAantal || 0)
                    )}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Per 1.000 inwoners (excl. AOW)</span>
                  <p style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0' }}>
                    {per1000(
                      (inkomen.bijstandAantal || 0) +
                      (inkomen.wwAantal || 0) +
                      (inkomen.aoAantal || 0)
                    ) || 0}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p>Geen uitkeringsdata beschikbaar voor dit gebied</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Deze data is niet voor alle buurten beschikbaar</p>
          </div>
        )}
      </Card>
    </div>
  );
}
