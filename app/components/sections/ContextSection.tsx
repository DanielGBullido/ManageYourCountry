'use client';

import context from '../../../data/contexto-eurostat.json';
import { everydayFunctionLabels, functionIdsByCode } from '../../lib/functional-scenario';
import { formatMillions } from '../../lib/format';
import LineCompare from './context/LineCompare';

// Colours validated with the dataviz palette checks: Spain (emphasis) vs EU (context grey);
// surplus vs deficit as a blue/red diverging pair that stays distinct with colour blindness.
const SPAIN = '#2e8049';
const EU = '#9ea59f';
const SURPLUS = '#256abf';
const DEFICIT = '#c4572f';

const percent = (digits = 1) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (value: number) => `${percent(1).format(value)} %`;
const pctAxis = (value: number) => `${percent(0).format(value)} %`;
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${percent(1).format(Math.abs(value))}`;

const levelNames: Record<string, { label: string; detail: string }> = {
  central: { label: 'Estado y organismos centrales', detail: 'Ministerios, agencias y empresas públicas del Estado' },
  regional: { label: 'Comunidades autónomas', detail: 'Gobiernos autonómicos y sus organismos' },
  local: { label: 'Ayuntamientos, diputaciones y cabildos', detail: 'Corporaciones locales' },
  socialSecurity: { label: 'Seguridad Social', detail: 'Pensiones contributivas, paro y otros fondos sociales' },
};

export default function ContextSection() {
  const years = context.series.map(entry => entry.year);
  const last = context.series[context.series.length - 1];
  const first = context.series[0];
  const functions = [...context.functions.items].sort((a, b) => b.spain - a.spain);
  const maxFunction = Math.max(...functions.flatMap(item => [item.spain, item.eu]));
  const levels = context.levels.items;
  const maxLevel = Math.max(...levels.map(level => Math.abs(level.balance)));
  const local = levels.find(level => level.id === 'local');

  return (
    <details className="deep-disclosure" id="contexto">
      <summary><span className="deep-summary-icon">04</span><span className="deep-summary-copy"><b>España en contexto</b><small>Déficit y deuda desde {first.year} · comparación con la UE · ayuntamientos</small></span><span className="deep-summary-action">Ver evolución <i>↓</i></span></summary>
      <section className="ctx-section" id="detalle-contexto">
        <div className="ctx-heading">
          <div><div className="eyebrow muted">ESPAÑA EN CONTEXTO · AÑOS COMPLETOS · EUROSTAT</div><h2>¿Gastamos mucho<br/><em>comparado con Europa?</em></h2></div>
          <p>Todas las administraciones juntas, también los ayuntamientos, y en porcentaje del PIB para poder comparar años y países. Son datos anuales: no se suman a las cuentas mensuales de arriba.</p>
        </div>

        <div className="ctx-kpis">
          <div><span>Déficit en {last.year}</span><b>{pct(-last.spain.balance)} del PIB</b><small>UE-27: {pct(-last.eu.balance)}</small></div>
          <div><span>Deuda en {last.year}</span><b>{pct(last.spain.debt)} del PIB</b><small>UE-27: {pct(last.eu.debt)}</small></div>
          <div><span>Gasto público en {last.year}</span><b>{pct(last.spain.spending)} del PIB</b><small>UE-27: {pct(last.eu.spending)}</small></div>
        </div>

        <div className="ctx-grid-2">
          <LineCompare title={`Saldo público, % del PIB (${first.year}–${last.year})`} years={years} zeroLine format={pct} formatTick={pctAxis}
            series={[{ id: 'es', label: 'España', color: SPAIN, values: context.series.map(entry => entry.spain.balance) }, { id: 'eu', label: 'UE-27', color: EU, values: context.series.map(entry => entry.eu.balance) }]}
            ariaSummary={`Por debajo de cero es déficit. España pasó de ${pct(first.spain.balance)} en ${first.year} a ${pct(last.spain.balance)} en ${last.year}; la UE-27, de ${pct(first.eu.balance)} a ${pct(last.eu.balance)}.`}/>
          <LineCompare title={`Deuda pública, % del PIB (${first.year}–${last.year})`} years={years} format={pct} formatTick={pctAxis}
            series={[{ id: 'es', label: 'España', color: SPAIN, values: context.series.map(entry => entry.spain.debt) }, { id: 'eu', label: 'UE-27', color: EU, values: context.series.map(entry => entry.eu.debt) }]}
            ariaSummary={`España pasó de ${pct(first.spain.debt)} en ${first.year} a ${pct(last.spain.debt)} en ${last.year}; la UE-27, de ${pct(first.eu.debt)} a ${pct(last.eu.debt)}.`}/>
        </div>
        <p className="ctx-note">Por debajo de cero, el gasto superó a los ingresos. La deuda sube con cada déficit y baja en proporción cuando el PIB crece más deprisa que ella. 2020 es el año de la pandemia.</p>

        <div className="ctx-block">
          <div className="ctx-block-head"><h3>Gasto por función, % del PIB · {context.functions.year}</h3><div className="ctx-legend"><span><i style={{ background: SPAIN }}/>España</span><span><i style={{ background: EU }}/>UE-27</span></div></div>
          <p className="ctx-block-intro">España gasta en total el {pct(context.functions.totalSpain)} de su PIB; la media de la UE-27, el {pct(context.functions.totalEu)}.</p>
          <div className="ctx-pairs" role="table" aria-label={`Gasto por función en % del PIB, España frente a la UE-27, ${context.functions.year}`}>
            <div className="ctx-pair-row ctx-pair-head" role="row"><span role="columnheader">Función</span><span role="columnheader" aria-hidden="true"/><span role="columnheader">España · UE-27</span></div>
            {functions.map(item => {
              const id = functionIdsByCode[item.code];
              const diff = item.spain - item.eu;
              return <div className="ctx-pair-row" role="row" key={item.code}>
                <span role="rowheader" className="ctx-pair-name">{everydayFunctionLabels[id] ?? item.code}</span>
                <span className="ctx-pair-bars" aria-hidden="true">
                  <i style={{ width: `${item.spain / maxFunction * 100}%`, background: SPAIN }} title={`España: ${pct(item.spain)}`}/>
                  <i style={{ width: `${item.eu / maxFunction * 100}%`, background: EU }} title={`UE-27: ${pct(item.eu)}`}/>
                </span>
                <span role="cell" className="ctx-pair-values"><b>{pct(item.spain)}</b> · {pct(item.eu)} <small className={diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : ''}>{Math.abs(diff) < 0.05 ? 'igual' : `${signed(diff)} pp`}</small></span>
              </div>;
            })}
          </div>
          <p className="ctx-note">«pp» son puntos porcentuales: la diferencia entre los dos porcentajes. Más gasto en proporción al PIB no significa por sí solo mejor ni peor servicio: depende de la población, los precios y la eficiencia.</p>
        </div>

        <div className="ctx-block">
          <div className="ctx-block-head"><h3>¿Quién tiene déficit? Saldo de cada administración · {context.levels.year}</h3><div className="ctx-legend"><span><i style={{ background: SURPLUS }}/>Superávit</span><span><i style={{ background: DEFICIT }}/>Déficit</span></div></div>
          <div className="ctx-levels" role="table" aria-label={`Saldo de cada nivel de administración en ${context.levels.year}, millones de euros`}>
            {levels.map(level => {
              const share = Math.abs(level.balance) / maxLevel * 50;
              const positive = level.balance >= 0;
              return <div className="ctx-level-row" role="row" key={level.id}>
                <span role="rowheader" className="ctx-level-name"><b>{levelNames[level.id].label}</b><small>{levelNames[level.id].detail}</small></span>
                <span className="ctx-level-track" aria-hidden="true"><i className="ctx-level-axis"/><i className={`ctx-level-bar ${positive ? 'pos' : 'neg'}`} style={{ width: `${share}%`, background: positive ? SURPLUS : DEFICIT }}/></span>
                <span role="cell" className="ctx-level-value">{positive ? '+' : '−'}{formatMillions(Math.abs(level.balance))}</span>
              </div>;
            })}
            <div className="ctx-level-row ctx-level-total" role="row"><span role="rowheader" className="ctx-level-name"><b>Total de las administraciones</b></span><span aria-hidden="true"/><span role="cell" className="ctx-level-value">{context.levels.total.balance >= 0 ? '+' : '−'}{formatMillions(Math.abs(context.levels.total.balance))}</span></div>
          </div>
          <p className="ctx-note">{local && local.balance > 0 ? `Los ayuntamientos, diputaciones y cabildos cerraron ${context.levels.year} con superávit: ingresaron ${formatMillions(local.balance)} más de lo que gastaron. ` : ''}Los saldos de los cuatro niveles suman el total. Su gasto no se puede sumar del mismo modo: el dinero que el Estado transfiere a comunidades y ayuntamientos contaría dos veces.</p>
        </div>

        <div className="people-source-links"><a href={context.sourceUrl} target="_blank" rel="noreferrer">Estadísticas de finanzas públicas · Eurostat ↗</a></div>
      </section>
    </details>
  );
}
