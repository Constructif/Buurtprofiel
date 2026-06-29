import { useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { SelectableCard } from '../../ui/SelectableCard';
import { CardTrendChart } from '../../ui/CardTrendChart';
import { InfoGrid } from '../../ui/InfoGrid';
import { TabScoreHeader } from '../../ui/TabScoreHeader';
import { berekenWonenScore } from '../../../utils/scoring';
import { useActiveBenchmarks } from '../../../hooks/useActiveBenchmarks';
import { fetchKerncijfersForYear, fetchKerncijfersAllYears } from '../../../services/cbs';
import { useCardYear } from '../../../hooks/useCardYear';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

function formatNumber(num: number): string {
  return num.toLocaleString('nl-NL');
}

const COLORS = ['#eb6608', '#1d1d1b', '#3498db', '#2ecc71'];

export function Wonen() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();
  const { set: benchmarks } = useActiveBenchmarks();

  // Alle hooks MOETEN boven early returns staan (React hooks regels)
  const code = gebiedData?.code ?? '';
  const defaultJaar = gebiedData?.kerncijfersJaar ?? 2025;

  const kcFetcher = useCallback(
    (jaar: number) => fetchKerncijfersForYear(code, jaar),
    [code]
  );
  const kcTrendFetcher = useCallback(
    () => fetchKerncijfersAllYears(code),
    [code]
  );

  const voorraadCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);
  const koopHuurCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);
  const huurDetailCard = useCardYear(defaultJaar, kcFetcher, kcTrendFetcher);

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om woningdata te bekijken</p>
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

  // Helper: extract woningen data
  const getWonenData = (card: typeof voorraadCard) => {
    const won = card.overrideData?.woningen ?? gebiedData.woningen;
    const jaar = card.overrideData?._jaar ?? gebiedData.kerncijfersJaar;
    return { won, jaar };
  };

  const voorraad = getWonenData(voorraadCard);
  const koopHuur = getWonenData(koopHuurCard);
  const huurDetail = getWonenData(huurDetailCard);

  // Woningvoorraad berekeningen
  const totaal = voorraad.won.totaal;
  const koopAantal = Math.round((voorraad.won.koopPercentage / 100) * totaal);
  const huurAantal = Math.round((voorraad.won.huurPercentage / 100) * totaal);

  // Koop/Huur data
  const koopHuurData = [
    { name: `Koop (${Math.round(koopHuur.won.koopPercentage)}%)`, value: koopHuur.won.koopPercentage },
    { name: `Huur (${Math.round(koopHuur.won.huurPercentage)}%)`, value: koopHuur.won.huurPercentage },
  ];

  // Woningtypes
  const woningtypeData = [
    { name: 'Appartement', value: Math.round(gebiedData.woningen.meergezinsPercentage) },
    { name: 'Tussenwoning', value: Math.round(gebiedData.woningen.tussenwoningPercentage) },
    { name: 'Hoekwoning', value: Math.round(gebiedData.woningen.hoekwoningPercentage) },
    { name: 'Twee-onder-één-kap', value: Math.round(gebiedData.woningen.tweeOnderEenKapPercentage) },
    { name: 'Vrijstaand', value: Math.round(gebiedData.woningen.vrijstaandPercentage) },
  ].filter(item => item.value > 0);
  const hasWoningtypeData = woningtypeData.length > 0;

  // Verhuisbewegingen
  const { bevolkingsDynamiek } = gebiedData;
  const hasVerhuisData = bevolkingsDynamiek && bevolkingsDynamiek.jaren.length > 0;
  const verhuisChartData = hasVerhuisData
    ? bevolkingsDynamiek.jaren.map((jaar) => ({
        jaar: jaar.jaar.toString(),
        Vestiging: jaar.vestiging || 0,
        Vertrek: jaar.vertrek || 0,
        Saldo: jaar.saldo,
      }))
    : [];
  const verhuisDataJaar = hasVerhuisData
    ? bevolkingsDynamiek.jaren[bevolkingsDynamiek.jaren.length - 1]?.jaar
    : undefined;

  // Score met de actieve benchmarks (schakelt mee met de toggle)
  const tabScore = berekenWonenScore(gebiedData, benchmarks);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <TabScoreHeader tabScore={tabScore} />

      {/* Woningvoorraad */}
      <SelectableCard sectionId="wonen-voorraad" title="Woningvoorraad" badge="data" year={voorraad.jaar}
        onYearChange={voorraadCard.handleYearChange} availableYears={voorraadCard.availableYears}
        activeYearMode={voorraadCard.activeMode} yearsWithData={voorraadCard.yearsWithData}>
        {voorraadCard.isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
        ) : voorraadCard.activeMode === 'trend' && voorraadCard.trendData ? (
          <CardTrendChart
            data={voorraadCard.trendData}
            lines={[{ key: 'huishoudens', label: 'Huishoudens', color: '#eb6608' }]}
          />
        ) : (
          <InfoGrid
            items={[
              { label: 'Totaal woningen', value: formatNumber(totaal) },
              { label: 'Koop', value: `${Math.round(voorraad.won.koopPercentage)}% (${formatNumber(koopAantal)})` },
              { label: 'Huur', value: `${Math.round(voorraad.won.huurPercentage)}% (${formatNumber(huurAantal)})` },
              { label: 'Huur sociaal', value: `${Math.round(voorraad.won.huurSociaalPercentage)}%` },
            ]}
          />
        )}
      </SelectableCard>

      {/* Charts grid */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Koop vs Huur */}
        <SelectableCard sectionId="wonen-koophuur" title="Koop vs Huur" badge="data" year={koopHuur.jaar}
          onYearChange={koopHuurCard.handleYearChange} availableYears={koopHuurCard.availableYears}
          activeYearMode={koopHuurCard.activeMode} yearsWithData={koopHuurCard.yearsWithData}>
          {koopHuurCard.isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
          ) : koopHuurCard.activeMode === 'trend' && koopHuurCard.trendData ? (
            <CardTrendChart
              data={koopHuurCard.trendData}
              lines={[{ key: 'huishoudens', label: 'Huishoudens', color: '#eb6608' }]}
            />
          ) : (
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={koopHuurData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label animationDuration={300}>
                    {koopHuurData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Math.round(value as number)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SelectableCard>

        {/* Woningtypes */}
        <SelectableCard sectionId="wonen-woningtypes" title="Woningtypes" badge={hasWoningtypeData ? "data" : "placeholder"} year={hasWoningtypeData ? gebiedData.kerncijfersJaar : undefined}>
          {hasWoningtypeData ? (
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={woningtypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    animationDuration={300} label={({ name, value }) => `${name}: ${value}%`}>
                    {woningtypeData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>Geen woningtype data beschikbaar voor dit gebied</p>
            </div>
          )}
        </SelectableCard>
      </div>

      {/* Huurdetails */}
      <SelectableCard sectionId="wonen-huurdetail" title="Huurwoningen Detail" badge="data" year={huurDetail.jaar}
        onYearChange={huurDetailCard.handleYearChange} availableYears={huurDetailCard.availableYears}
        activeYearMode={huurDetailCard.activeMode} yearsWithData={huurDetailCard.yearsWithData}>
        {huurDetailCard.isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Laden...</div>
        ) : huurDetailCard.activeMode === 'trend' && huurDetailCard.trendData ? (
          <CardTrendChart
            data={huurDetailCard.trendData}
            lines={[{ key: 'huishoudens', label: 'Huishoudens', color: '#eb6608' }]}
          />
        ) : (
          <InfoGrid
            items={[
              { label: 'Totaal huur', value: `${Math.round(huurDetail.won.huurPercentage)}%` },
              { label: 'Woningcorporatie', value: `${Math.round(huurDetail.won.huurSociaalPercentage)}%` },
              { label: 'Overige verhuurders', value: `${Math.round(huurDetail.won.huurParticulierPercentage)}%` },
            ]}
          />
        )}
      </SelectableCard>

      {/* Verhuisbewegingen */}
      <SelectableCard
        sectionId="wonen-verhuisbewegingen"
        title={`Verhuisbewegingen${gebiedData.gemeenteNaam && selectedGebied?.type !== 'gemeente' ? ` - Gemeente ${gebiedData.gemeenteNaam}` : ''}`}
        badge={hasVerhuisData ? "data" : "placeholder"}
        year={verhuisDataJaar}
      >
        {hasVerhuisData ? (
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              Verhuizingen van en naar de gemeente per jaar (CBS Data)
            </p>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verhuisChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="jaar" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value, name) => [formatNumber(value as number), name as string]}
                    labelFormatter={(label) => `Jaar ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="Vestiging" name="Vestiging (in)" fill="#2ecc71" animationDuration={300} />
                  <Bar dataKey="Vertrek" name="Vertrek (uit)" fill="#e74c3c" animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {verhuisChartData.map((item) => (
                <div key={item.jaar} style={{ padding: '8px 12px', backgroundColor: item.Saldo >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.jaar}: </span>
                  <span style={{ fontWeight: 600, color: item.Saldo >= 0 ? '#15803d' : '#dc2626' }}>
                    {item.Saldo >= 0 ? '+' : ''}{formatNumber(item.Saldo)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p>Geen verhuisdata beschikbaar</p>
          </div>
        )}
      </SelectableCard>

      {/* Woningcorporaties - placeholder */}
      <SelectableCard sectionId="wonen-corporaties" title="Woningcorporaties" badge="placeholder">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
          <p>Nog geen data beschikbaar</p>
        </div>
      </SelectableCard>
    </div>
  );
}
