import { ImageResponse } from 'next/og';
import { formatMillions } from '../lib/format';
import { buildShareSummary } from '../lib/share-summary';
import { spendingBar } from '../lib/budget-scenario';

// Preview image for shared links (WhatsApp, redes, mensajería): the scenario's
// balance and its three largest changes, or the official figures of the period.
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const summary = buildShareSummary({ mes: params.get('mes'), vista: params.get('vista'), reparto: params.get('reparto'), deficit: params.get('deficit') });
  const deficit = summary.balance < 0;
  const balanceLabel = deficit ? `Faltan ${formatMillions(-summary.balance)}` : summary.balance > 0 ? `Sobran ${formatMillions(summary.balance)}` : 'Cuadra exacto';
  const { fill, overflow } = spendingBar(summary.spent, summary.revenue);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: '#f4f4ee', color: '#202923', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#26392c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8904a', fontSize: 30, fontWeight: 700 }}>€</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 22, letterSpacing: 2, color: '#476c50' }}><span>ESPAÑA</span><span>EN TUS MANOS</span></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 34, color: '#59645a' }}>{`${summary.isScenario ? 'Mi reparto del gasto público' : 'Cuentas públicas'} · ${summary.periodLabel}`}</div>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -3, color: deficit ? '#a8472f' : '#2e6b40' }}>{balanceLabel}</div>
        <div style={{ fontSize: 30, color: '#3d473e' }}>{`Gasto ${formatMillions(summary.spent)} de ${formatMillions(summary.revenue)} que entraron`}</div>
        <div style={{ display: 'flex', width: '100%', height: 18, borderRadius: 9, background: '#dfe5dc', overflow: 'hidden' }}>
          <div style={{ width: `${fill}%`, background: '#476c50' }}/>
          {overflow > 0 && <div style={{ width: `${overflow}%`, background: '#c4572f' }}/>}
        </div>
        {summary.changes.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 26, color: '#4f5a50' }}>
          {summary.changes.map(change => <span key={change.label}>{`${change.delta > 0 ? '▲' : '▼'} ${change.label}: ${change.delta > 0 ? '+' : '−'}${formatMillions(Math.abs(change.delta))}`}</span>)}
        </div>}
      </div>
      <div style={{ fontSize: 24, color: '#6f796f' }}>{summary.isScenario ? 'Prueba tu propio reparto con datos oficiales' : 'Datos oficiales · prueba tu propio reparto'}</div>
    </div>,
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
