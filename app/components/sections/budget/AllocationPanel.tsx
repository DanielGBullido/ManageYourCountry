import type { ReactNode } from 'react';
import { eurosPerResident, lineSliderMax, lineStep, type BudgetLine } from '../../../lib/budget-scenario';
import { formatMillions } from '../../../lib/format';
import type { PeriodKind } from '../../../lib/year-to-date';

type AllocationPanelProps = {
  lines: BudgetLine[];
  amounts: number[];
  drafts: string[];
  budget: number;
  periodLabel: string;
  periodKind: PeriodKind;
  allowDeficit: boolean;
  spent: number;
  unallocated: number;
  deficit: number;
  residents: number;
  dock: ReactNode;
  onToggleDeficit: (allow: boolean) => void;
  onSetLine: (index: number, amount: number) => void;
  onDraftChange: (index: number, value: string) => void;
  onCommitDraft: (index: number) => void;
  onSetAllZero: () => void;
  onResetOfficial: () => void;
  onShare: () => void;
};

const euros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

export default function AllocationPanel({ lines, amounts, drafts, budget, periodLabel, periodKind, allowDeficit, residents, dock, onToggleDeficit, onSetLine, onDraftChange, onCommitDraft, onSetAllZero, onResetOfficial, onShare }: AllocationPanelProps) {
  const periodWord = periodKind === 'year' ? 'al año' : periodKind === 'ytd' ? 'en el periodo' : 'al mes';
  return <article className="panel allocation-panel">
    <div className="panel-top"><div><div className="eyebrow muted">GASTO PÚBLICO · {periodLabel.toUpperCase()} · M€</div><h3>Redistribuye el gasto</h3></div></div>
    <p className="sim-intro">Empiezas con lo que se gastó de verdad. Mueve las barras o usa − y + para cambiar cada partida; el resultado se ve abajo al momento.</p>
    <div className="budget-actions">
      <button className="reset-button" onClick={onResetOfficial}>↺ Volver al dato oficial</button>
      <button className="leave-unassigned-button" onClick={onSetAllZero}>Empezar de cero</button>
      <button className="share-scenario-button" onClick={onShare}>Compartir ↗</button>
    </div>
    <label className={`deficit-toggle ${allowDeficit ? 'active' : ''}`}>
      <input type="checkbox" checked={allowDeficit} onChange={event => onToggleDeficit(event.target.checked)}/>
      <span><b>Permitir déficit</b><small>Gastar más de lo que entra. La diferencia se pediría prestada y se sumaría a la deuda pública.</small></span>
    </label>
    <div className="sim-list">{lines.map((line, index) => {
      const amount = amounts[index];
      const delta = amount - line.amount;
      const same = Math.abs(delta) < 0.5;
      const max = lineSliderMax(line.amount, amount, budget);
      const step = lineStep(line.amount);
      const officialPosition = max > 0 ? Math.min(100, line.amount / max * 100) : 0;
      const changePercent = line.amount > 0 ? delta / line.amount * 100 : 0;
      const perResident = Math.round(eurosPerResident(Math.abs(delta), residents));
      const tone = same ? 'neutral' : delta > 0 ? 'positive' : 'negative';
      return <div className="sim-row" key={line.id}>
        <div className="sim-row-head">
          <label className="sim-name" htmlFor={`amount-${line.id}`}><i className="color-chip" style={{ background: line.color }}/>{line.label}</label>
          <div className="sim-stepper">
            <button type="button" onClick={() => onSetLine(index, amount - step)} aria-label={`Restar ${formatMillions(step)} a ${line.label}`}>−</button>
            <input id={`amount-${line.id}`} type="number" min="0" step="1" inputMode="numeric" value={drafts[index] ?? String(amount)}
              onChange={event => onDraftChange(index, event.target.value)} onBlur={() => onCommitDraft(index)}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onCommitDraft(index); event.currentTarget.blur(); } }}
              aria-label={`Importe para ${line.label} en millones de euros`}/>
            <button type="button" onClick={() => onSetLine(index, amount + step)} aria-label={`Sumar ${formatMillions(step)} a ${line.label}`}>+</button>
          </div>
        </div>
        <span className="sim-range">
          <input type="range" min="0" max={max} step="1" value={Math.min(amount, max)} onChange={event => onSetLine(index, Number(event.target.value))}
            style={{ ['--fill' as string]: `${Math.min(100, amount / max * 100)}%`, ['--chip' as string]: line.color }}
            aria-label={`${line.label}: ${formatMillions(amount)}. Dato oficial ${formatMillions(line.amount)}`}/>
          <i className="sim-official-mark" style={{ left: `${officialPosition}%` }} title={`Dato oficial: ${formatMillions(line.amount)}`} aria-hidden="true"/>
        </span>
        <div className={`sim-delta ${tone}`} aria-live="polite">
          {same
            ? <span>Igual que el dato oficial ({formatMillions(line.amount)})</span>
            : <span><b>{delta > 0 ? '+' : '−'}{formatMillions(Math.abs(delta))}</b> ({delta > 0 ? '+' : '−'}{percent.format(Math.abs(changePercent))} %) · {delta > 0 ? '+' : '−'}{euros.format(perResident)} € por residente {periodWord}</span>}
          {!same && <button type="button" className="sim-reset-line" onClick={() => onSetLine(index, line.amount)} aria-label={`Volver al dato oficial de ${line.label}`}>↺ oficial</button>}
        </div>
        <details className="sim-more">
          <summary>Qué incluye</summary>
          <p>{line.description}</p>
          <p className="sim-official-name">Nombre en las cuentas IGAE: {line.officialLabel}</p>
          {line.relatedSources && <div className="sim-related"><small>Registros para investigar esta clase de gasto. No identifican necesariamente los mismos importes, meses o entidades del total IGAE.</small><ul>{line.relatedSources.map(source => <li key={source.href}><a href={source.href} target={source.href.startsWith('#') ? undefined : '_blank'} rel={source.href.startsWith('#') ? undefined : 'noreferrer'}>{source.label}{source.href.startsWith('#') ? '' : ' ↗'}</a></li>)}</ul></div>}
          <button type="button" className="sim-zero" onClick={() => onSetLine(index, 0)}>Poner a 0 €</button>
        </details>
      </div>;
    })}</div>
    <p className="sim-marker-note"><i aria-hidden="true"/> La marca de cada barra es el gasto oficial {periodKind === 'year' ? 'del' : 'de'} {periodLabel.toLowerCase()}: una referencia, no un mínimo necesario.</p>
    {dock}
  </article>;
}
