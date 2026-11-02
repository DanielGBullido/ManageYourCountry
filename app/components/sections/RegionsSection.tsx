'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { DashboardData } from '../../lib/dashboard-data';
import { formatPreciseMillions } from '../../lib/format';

const RegionalMap = dynamic(() => import('../RegionalMap'), {
  loading: () => <div className="map-status" role="status">Preparando el mapa…</div>,
});

type RegionMetric = 'igaeAugustTax' | 'igaeAugustRevenue' | 'igaeAugustExpenditure' | 'igaeAugustBalance' | 'fiscalCapacity' | 'systemFunding';

export default function RegionsSection({ regions }: { regions: DashboardData['regions'] }) {
  const monthlyPeriod = regions.igaeMonthly.period.split(' · ')[0];
  const [regionMetric, setRegionMetric] = useState<RegionMetric>('igaeAugustTax');
  const [isExpanded, setIsExpanded] = useState(false);
  const regionMetricInfo = {
    igaeAugustTax: { label: 'Impuestos registrados', period: regions.igaeMonthly.period, description: regions.igaeMonthly.taxDescription, sourceUrl: regions.igaeMonthly.sourceUrl },
    igaeAugustRevenue: { label: 'Ingresos totales de la comunidad', period: regions.igaeMonthly.period, description: regions.igaeMonthly.revenueDescription, sourceUrl: regions.igaeMonthly.sourceUrl },
    igaeAugustExpenditure: { label: 'Gastos totales de la comunidad', period: regions.igaeMonthly.period, description: regions.igaeMonthly.expenditureDescription, sourceUrl: regions.igaeMonthly.sourceUrl },
    igaeAugustBalance: { label: 'Saldo mensual de la comunidad', period: regions.igaeMonthly.period, description: regions.igaeMonthly.balanceDescription, sourceUrl: regions.igaeMonthly.sourceUrl },
    fiscalCapacity: { label: 'Capacidad fiscal normativa', period: 'Liquidación 2024', description: regions.fiscalCapacityDescription, sourceUrl: regions.sourceUrl },
    systemFunding: { label: 'Financiación del sistema', period: 'Liquidación 2024', description: regions.fundingDescription, sourceUrl: regions.sourceUrl },
  } as const;
  const selectedRegionMetric = regionMetricInfo[regionMetric];
  const regionRows = [...regions.communities].filter(region => typeof region[regionMetric] === 'number').sort((a, b) => Number(b[regionMetric] ?? 0) - Number(a[regionMetric] ?? 0));
  const regionMax = Math.max(...regionRows.map(region => Math.abs(Number(region[regionMetric] ?? 0))), 1);
  return (
<details className="deep-disclosure" id="comunidades" onToggle={event => setIsExpanded(event.currentTarget.open)}>
        <summary><span className="deep-summary-icon">03</span><span className="deep-summary-copy"><b>Comunidades autónomas</b><small>Mapa interactivo · impuestos, ingresos, gasto y financiación</small></span><span className="deep-summary-action">Comparar territorios <i>↓</i></span></summary>
      <section className="regions-section" id="detalle-comunidades">
        <div className="regions-heading"><div><div className="eyebrow muted">COMUNIDADES AUTÓNOMAS · DATOS CON PERIODOS DISTINTOS</div><h2>¿Qué dinero entra<br/><em>en cada comunidad?</em></h2></div><p>Compara por separado los impuestos registrados, todos los ingresos de cada administración y la financiación que reparte el sistema común.</p></div>
        <div className="regions-explainer"><article><b>Impuestos registrados · {monthlyPeriod}</b><p>{regions.igaeMonthly.taxDescription}</p><small>IGAE · {regions.igaeMonthly.period} · mes calculado a partir de acumulados</small></article><article><b>Ingresos de la comunidad</b><p>{regions.igaeMonthly.revenueDescription}</p><small>IGAE · {regions.igaeMonthly.period} · impuestos, transferencias, ventas, tasas y rentas públicas</small></article><article><b>Capacidad fiscal normativa</b><p>{regions.fiscalCapacityDescription}</p><small>Hacienda · liquidación 2024</small></article><article><b>Financiación del sistema común</b><p>{regions.fundingDescription}</p><small>Hacienda · liquidación 2024</small></article></div>
        <div className="regions-table-top"><div><b>{selectedRegionMetric.label}</b><small>{selectedRegionMetric.period} · millones de euros</small></div><label>Ver dato <select value={regionMetric} onChange={event => setRegionMetric(event.target.value as typeof regionMetric)}><option value="igaeAugustTax">Impuestos registrados · {monthlyPeriod}</option><option value="igaeAugustRevenue">Ingresos totales · {monthlyPeriod}</option><option value="igaeAugustExpenditure">Gastos totales · {monthlyPeriod}</option><option value="igaeAugustBalance">Saldo mensual · {monthlyPeriod}</option><option value="fiscalCapacity">Capacidad fiscal normativa · 2024</option><option value="systemFunding">Financiación recibida · 2024</option></select></label></div>
        <p className="region-metric-description">{selectedRegionMetric.description} <a href={selectedRegionMetric.sourceUrl} target="_blank" rel="noreferrer">Ver fuente ↗</a></p>
        {isExpanded && <RegionalMap communities={regions.communities.map(region => ({ name: region.name, value: typeof region[regionMetric] === 'number' ? Number(region[regionMetric]) : null }))} metricLabel={selectedRegionMetric.label} period={selectedRegionMetric.period} />}
        <div className="region-table" role="table" aria-label={`${selectedRegionMetric.label}, ${selectedRegionMetric.period}`}><div className="region-row region-table-head single-metric" role="row"><span role="columnheader">Comunidad autónoma</span><span role="columnheader">{selectedRegionMetric.label} · M€</span></div>{regionRows.map(region => <div className="region-row single-metric" role="row" key={region.name}><b role="cell">{region.name}</b><span role="cell"><i className={`region-bar ${regionMetric.includes('igae') ? 'funding' : 'fiscal'}${regionMetric === 'igaeAugustBalance' && Number(region[regionMetric] ?? 0) < 0 ? ' negative' : ''}`} style={{width:`${Math.abs(Number(region[regionMetric] ?? 0)) / regionMax * 100}%`}}/><strong>{formatPreciseMillions(Number(region[regionMetric] ?? 0))}</strong></span></div>)}</div>
        <p className="regions-note">Los datos mensuales miden las cuentas de cada administración autonómica, no todos los impuestos pagados por las personas y empresas de ese territorio. Navarra y País Vasco tienen haciendas forales: la serie IGAE no recoge sus impuestos con el mismo alcance, y la liquidación del sistema común no las incluye. No compares directamente {monthlyPeriod} con el año completo 2024.</p>
        <div className="people-source-links region-links"><a href={regions.igaeMonthly.sourceUrl} target="_blank" rel="noreferrer">Serie mensual por comunidad · IGAE ↗</a><a href={regions.sourceUrl} target="_blank" rel="noreferrer">Liquidación del sistema · Hacienda ↗</a></div>
      </section>

      </details>
  );
}
