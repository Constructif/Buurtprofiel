import { useState } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import { Card } from '../../ui/Card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

export function Veiligheid() {
  const { gebiedData, selectedGebied, isLoadingData } = useGebiedStore();

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
        <p style={{ fontSize: '20px' }}>Selecteer een gebied om veiligheidsdata te bekijken</p>
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

  const { criminaliteit, bevolking, dataJaar } = gebiedData;

  // Verbeterde veiligheidsscore berekening
  // Gebaseerd op gewogen criminaliteit per 1000 inwoners
  // High-impact delicten wegen zwaarder dan veelvoorkomende delicten
  // Benchmark: Nederland gemiddeld ~46 misdrijven per 1000 inwoners (CBS 2024)
  const calculateVeiligheidsScore = (): { score: number; misdrijvenPer1000: number } | null => {
    if (bevolking.totaal === 0) return null;

    // Gewogen score: high-impact delicten wegen 3x zwaarder
    // High-impact: geweld, straatroof, overval, inbraak woning
    const highImpact = criminaliteit.geweld + criminaliteit.inbraakWoningen;
    // Veelvoorkomend: overige vermogensdelicten, vernieling
    const veelvoorkomend = criminaliteit.vermogen - criminaliteit.inbraakWoningen + criminaliteit.vernieling;

    // Gewogen totaal (high-impact telt 2.5x zwaarder)
    const gewogenTotaal = (highImpact * 2.5) + veelvoorkomend;
    const gewogenPer1000 = (gewogenTotaal / bevolking.totaal) * 1000;

    // Ongewogen voor weergave
    const misdrijvenPer1000 = (criminaliteit.totaal / bevolking.totaal) * 1000;

    // Score berekening:
    // 10 = 0 gewogen misdrijven per 1000
    // 7.5 = ~30 gewogen (veilig, onder gemiddeld)
    // 5.0 = ~60 gewogen (gemiddeld)
    // 2.5 = ~90 gewogen (onveilig)
    // 0 = 120+ gewogen (zeer onveilig)
    const score = Math.max(0, Math.min(10, 10 - (gewogenPer1000 / 12)));

    return {
      score: Math.round(score * 10) / 10,
      misdrijvenPer1000: Math.round(misdrijvenPer1000)
    };
  };

  const veiligheidsResult = calculateVeiligheidsScore();
  const veiligheidsScore = veiligheidsResult?.score ?? null;
  const misdrijvenPer1000 = veiligheidsResult?.misdrijvenPer1000 ?? 0;

  const scoreColor = veiligheidsScore !== null
    ? veiligheidsScore >= 7 ? '#22c55e'
    : veiligheidsScore >= 5 ? '#f59e0b'
    : '#ef4444'
    : '#9ca3af';

  // Pie chart data
  const bekendeTotaal = criminaliteit.vermogen + criminaliteit.geweld + criminaliteit.vernieling +
                       criminaliteit.drugsOverlast + criminaliteit.burengerucht + criminaliteit.huisvredebreuk +
                       criminaliteit.fraude + criminaliteit.verkeer + criminaliteit.brandOntploffing +
                       criminaliteit.aantastingOpenbareOrde + criminaliteit.cybercrime;
  const overig = Math.max(0, criminaliteit.totaal - bekendeTotaal);

  const chartData = [
    { name: 'Vermogensdelicten', value: criminaliteit.vermogen, color: '#eb6608' },
    { name: 'Geweldsdelicten', value: criminaliteit.geweld, color: '#e74c3c' },
    { name: 'Vernielingen', value: criminaliteit.vernieling, color: '#3498db' },
    { name: 'Verkeer', value: criminaliteit.verkeer, color: '#f39c12' },
    { name: 'Overlast', value: criminaliteit.drugsOverlast + criminaliteit.burengerucht + criminaliteit.huisvredebreuk, color: '#9b59b6' },
    { name: 'Fraude', value: criminaliteit.fraude, color: '#2ecc71' },
    { name: 'Overig', value: overig + criminaliteit.brandOntploffing + criminaliteit.aantastingOpenbareOrde + criminaliteit.cybercrime, color: '#95a5a6' },
  ].filter(item => item.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Veiligheidsscore - compacter */}
      <Card title="Veiligheidsscore" badge="data" year={dataJaar}>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            {/* Hoofdscore links */}
            <div style={{ textAlign: 'center', minWidth: '120px', position: 'relative' }}>
              <div style={{ fontSize: '42px', fontWeight: 700, color: scoreColor, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {veiligheidsScore !== null ? veiligheidsScore.toFixed(1) : '-'}
                <span style={{ fontSize: '18px', color: '#d1d5db' }}>/10</span>
                <InfoIcon />
              </div>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '13px' }}>
                {misdrijvenPer1000} per 1.000 inw.
              </p>
            </div>

            {/* Vergelijkingskolommen rechts */}
            {gebiedData.veiligheidsVergelijking && (
              <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px', flexWrap: 'wrap' }}>
                <ScoreColumn
                  label="Buurt"
                  score={gebiedData.veiligheidsVergelijking.buurt?.score}
                  naam={gebiedData.veiligheidsVergelijking.buurt?.naam}
                  isActive={selectedGebied?.type === 'buurt'}
                />
                <ScoreColumn
                  label="Wijk"
                  score={gebiedData.veiligheidsVergelijking.wijk?.score}
                  naam={gebiedData.veiligheidsVergelijking.wijk?.naam}
                  isActive={selectedGebied?.type === 'wijk'}
                />
                <ScoreColumn
                  label="Gemeente"
                  score={gebiedData.veiligheidsVergelijking.gemeente?.score}
                  naam={gebiedData.veiligheidsVergelijking.gemeente?.naam}
                  isActive={selectedGebied?.type === 'gemeente'}
                />
                <ScoreColumn
                  label="Nederland"
                  score={gebiedData.veiligheidsVergelijking.nederland?.score}
                  naam={gebiedData.veiligheidsVergelijking.nederland?.naam}
                  isActive={false}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Charts naast elkaar - direct onder veiligheidsscore */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Criminaliteit per type - chart */}
        <Card title="Criminaliteit per Type" badge={criminaliteit.totaal > 0 ? "data" : "placeholder"} year={dataJaar}>
          {criminaliteit.totaal > 0 ? (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '8px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Pie chart */}
              <div style={{ width: '160px', height: '160px', flexShrink: 0, minWidth: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} misdrijven`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda */}
              <div style={{ flex: 1, minWidth: '180px', width: '100%' }}>
                {chartData.map((item) => {
                  const percentage = Math.round((item.value / criminaliteit.totaal) * 100);
                  return (
                    <div key={item.name} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', backgroundColor: item.color, display: 'inline-block' }} />
                          {item.name}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1b' }}>
                          {item.value} ({percentage}%)
                        </span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>Geen criminaliteitsdata beschikbaar</p>
            </div>
          )}
        </Card>

        {/* Trend - 5 jaar */}
        <Card title="Trend (5 jaar)" badge={gebiedData.criminaliteitTrend?.jaren && gebiedData.criminaliteitTrend.jaren.length > 0 ? "data" : "placeholder"} year={dataJaar}>
          {gebiedData.criminaliteitTrend?.jaren && gebiedData.criminaliteitTrend.jaren.length > 0 ? (
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gebiedData.criminaliteitTrend.jaren} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="jaar" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={40} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0', fontSize: '12px' }}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        vermogen: 'Vermogensdelicten',
                        geweld: 'Geweldsdelicten',
                        vernieling: 'Vernielingen',
                        verkeer: 'Verkeer',
                      };
                      return [value, labels[String(name)] || name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        vermogen: 'Vermogen',
                        geweld: 'Geweld',
                        vernieling: 'Vernieling',
                        verkeer: 'Verkeer',
                      };
                      return labels[value] || value;
                    }}
                  />
                  <Line type="monotone" dataKey="vermogen" stroke="#eb6608" strokeWidth={2} dot={{ fill: '#eb6608', r: 3 }} />
                  <Line type="monotone" dataKey="geweld" stroke="#e74c3c" strokeWidth={2} dot={{ fill: '#e74c3c', r: 3 }} />
                  <Line type="monotone" dataKey="vernieling" stroke="#3498db" strokeWidth={2} dot={{ fill: '#3498db', r: 3 }} />
                  <Line type="monotone" dataKey="verkeer" stroke="#f39c12" strokeWidth={2} dot={{ fill: '#f39c12', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <p>Geen trenddata beschikbaar</p>
            </div>
          )}
        </Card>
      </div>

      {/* Criminaliteitscijfers - 5 kolommen */}
      <Card title="Criminaliteitscijfers" badge="data" year={dataJaar}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          <StatBox label="Totaal" value={criminaliteit.totaal} highlight />
          <StatBox label="Vermogensdelicten" value={criminaliteit.vermogen} />
          <StatBox label="Geweldsdelicten" value={criminaliteit.geweld} />
          <StatBox label="Vernielingen" value={criminaliteit.vernieling} />
          <StatBox label="Verkeer" value={criminaliteit.verkeer} />
        </div>
      </Card>

      {/* Detail grids - 4 kolommen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Vermogensdelicten detail */}
        <Card title="Vermogensdelicten" badge="data" year={dataJaar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <MeldingRow label="Inbraak woningen" value={criminaliteit.inbraakWoningen} />
            <MeldingRow label="Inbraak schuur/garage" value={criminaliteit.inbraakSchuur} />
            <MeldingRow label="Inbraak bedrijven" value={criminaliteit.inbraakBedrijven} />
            <MeldingRow label="Diefstal auto's" value={criminaliteit.dieftalAutos} />
            <MeldingRow label="Diefstal uit auto's" value={criminaliteit.dieftalUitAutos} />
            <MeldingRow label="Fietsendiefstal" value={criminaliteit.dieftalFietsen} />
            <MeldingRow label="Zakkenrollerij" value={criminaliteit.zakkenrollerij} />
            <MeldingRow label="Winkeldiefstal" value={criminaliteit.winkeldiefstal} />
          </div>
        </Card>

        {/* Geweldsdelicten detail */}
        <Card title="Geweldsdelicten" badge="data" year={dataJaar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <MeldingRow label="Mishandeling" value={criminaliteit.mishandeling} />
            <MeldingRow label="Bedreiging" value={criminaliteit.bedreiging} />
            <MeldingRow label="Openlijk geweld" value={criminaliteit.openlijkGeweld} />
            <MeldingRow label="Straatroof" value={criminaliteit.straatroof} />
            <MeldingRow label="Overval" value={criminaliteit.overval} />
            <MeldingRow label="Zedenmisdrijf" value={criminaliteit.zedenmisdrijf} />
            <MeldingRow label="Moord/doodslag" value={criminaliteit.moordDoodslag} />
          </div>
        </Card>

        {/* Overlast & Overige delicten */}
        <Card title="Overlast & Overig" badge="data" year={dataJaar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <MeldingRow label="Vernieling" value={criminaliteit.vernieling} />
            <MeldingRow label="Drugs/drankoverlast" value={criminaliteit.drugsOverlast} />
            <MeldingRow label="Burengerucht" value={criminaliteit.burengerucht} />
            <MeldingRow label="Huisvredebreuk" value={criminaliteit.huisvredebreuk} />
            <MeldingRow label="Fraude" value={criminaliteit.fraude} />
            <MeldingRow label="Brand/ontploffing" value={criminaliteit.brandOntploffing} />
            <MeldingRow label="Openbare orde" value={criminaliteit.aantastingOpenbareOrde} />
            <MeldingRow label="Cybercrime" value={criminaliteit.cybercrime} />
          </div>
        </Card>

        {/* Verkeer */}
        <Card title="Verkeer" badge="data" year={dataJaar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <MeldingRow label="Verkeersongevallen" value={criminaliteit.verkeersOngevallen} />
            <MeldingRow label="Rijden onder invloed" value={criminaliteit.rijdenOnderInvloed} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScoreColumn({
  label,
  score,
  naam,
  isActive,
}: {
  label: string;
  score?: number;
  naam?: string;
  isActive: boolean;
}) {
  const getScoreColor = (s: number) => {
    if (s >= 7) return '#22c55e';
    if (s >= 5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div
      style={{
        flex: '1 1 70px',
        minWidth: '70px',
        textAlign: 'center',
        padding: '10px 6px',
        backgroundColor: isActive ? '#f5f1ee' : 'transparent',
        border: isActive ? '2px solid #eb6608' : '1px solid #e5e7eb',
      }}
    >
      <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: 500 }}>
        {label}
      </p>
      {score !== undefined ? (
        <>
          <p style={{ fontSize: '22px', fontWeight: 700, color: getScoreColor(score), margin: 0, lineHeight: 1 }}>
            {score.toFixed(1)}
          </p>
          {naam && (
            <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {naam}
            </p>
          )}
        </>
      ) : (
        <p style={{ fontSize: '22px', fontWeight: 700, color: '#d1d5db', margin: 0 }}>-</p>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: highlight ? '#eb6608' : '#f5f1ee',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '11px', color: highlight ? 'rgba(255,255,255,0.8)' : '#6b7280', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 700, color: highlight ? 'white' : '#1d1d1b', margin: 0 }}>{value}</p>
    </div>
  );
}

function MeldingRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 10px',
        backgroundColor: highlight ? '#eb6608' : '#f5f1ee',
        color: highlight ? 'white' : undefined,
        fontSize: '13px',
      }}
    >
      <span style={{ fontWeight: highlight ? 500 : 400, color: highlight ? 'white' : '#4b5563' }}>{label}</span>
      <span style={{ fontWeight: 700, color: highlight ? 'white' : '#1d1d1b' }}>{value}</span>
    </div>
  );
}

function InfoIcon() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ cursor: 'help' }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '12px 16px',
            backgroundColor: '#1d1d1b',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            lineHeight: '1.5',
            width: '320px',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Berekening Veiligheidsscore</p>
          <p style={{ marginBottom: '8px' }}>
            De score is gebaseerd op <strong>gewogen</strong> criminaliteitscijfers per 1.000 inwoners.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>High-impact delicten</strong> (geweld, woninginbraak) wegen <strong>2.5x zwaarder</strong> dan veelvoorkomende delicten (fietsendiefstal, vernieling).
          </p>
          <p style={{ marginBottom: '8px', fontSize: '11px', color: '#9ca3af' }}>
            Formule: Score = 10 - (gewogen misdrijven per 1000 / 12)
          </p>
          <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
            10 = zeer veilig | 7+ = veilig | 5 = gemiddeld | &lt;5 = onveilig
          </p>
          <a
            href="https://onderzoek.amsterdam.nl/dataset/cijfers-veiligheidsindex"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'underline' }}
          >
            Meer over de methodologie
          </a>
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1d1d1b',
            }}
          />
        </div>
      )}
    </div>
  );
}
