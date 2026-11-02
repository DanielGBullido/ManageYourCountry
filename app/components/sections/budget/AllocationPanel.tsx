import type { BudgetLine } from '../../../lib/budget-scenario';
import { formatMillions } from '../../../lib/format';

type AllocationPanelProps = {
  lines: BudgetLine[];
  amounts: number[];
  drafts: string[];
  budget: number;
  periodLabel: string;
  onSetLine: (index: number, amount: number) => void;
  onDraftChange: (index: number, value: string) => void;
  onCommitDraft: (index: number) => void;
  onSetAllZero: () => void;
  onResetOfficial: () => void;
  onShare: () => void;
};

export default function AllocationPanel({ lines, amounts, drafts, budget, periodLabel, onSetLine, onDraftChange, onCommitDraft, onSetAllZero, onResetOfficial, onShare }: AllocationPanelProps) {
  return <article className="panel allocation-panel">
    <div className="panel-top"><div><div className="eyebrow muted">GASTO PÚBLICO · MILLONES DE EUROS</div><h3>Redistribuye el gasto</h3></div></div>
    <div className="budget-actions">
      <button className="share-scenario-button" onClick={onShare}>Compartir escenario ↗</button>
      <button className="leave-unassigned-button" onClick={onSetAllZero}>Dejar todo sin repartir</button>
      <button className="reset-button" onClick={onResetOfficial}>↺ Volver al dato oficial</button>
    </div>
    <div className="budget-total">
      <div><span className="eyebrow muted">INGRESOS DEL MES · {periodLabel.toUpperCase()}</span><strong>{formatMillions(budget)}</strong></div>
      <div className="budget-total-spent"><span className="eyebrow muted">GASTADO EN TU ESCENARIO</span><strong>{formatMillions(amounts.reduce((sum, amount) => sum + amount, 0))}</strong></div>
      <div className="budget-total-unassigned"><span className="eyebrow muted">DINERO DISPONIBLE</span><strong>{formatMillions(Math.max(0, budget - amounts.reduce((sum, amount) => sum + amount, 0)))}</strong><small>Ingresos del mes menos lo que has asignado.</small></div>
    </div>
    <div className="official-marker-legend"><i aria-hidden="true"/> Gasto oficial observado en {periodLabel.toLowerCase()} · referencia, no mínimo de funcionamiento</div>
    <div className="allocation-list official-allocations">{lines.map((line, index) => {
      const delta = amounts[index] - line.amount;
      const officialPosition = budget > 0 ? Math.min(100, Math.max(0, line.amount / budget * 100)) : 0;
      const markerOffset = 8 - (16 * officialPosition / 100);
      return <div className="allocation-row" key={line.id}>
        <span className="allocation-name"><i className="color-chip" style={{ background: line.color }}/><span><b>{line.label}</b><small className="allocation-description">{line.description}</small><details className="source-term"><summary>Nombre en las cuentas</summary><span>IGAE: {line.officialLabel}</span></details>{line.relatedSources && <details className="related-records"><summary>Consultar registros relacionados</summary><small>Sirven para investigar esta clase de gasto. No identifican necesariamente los mismos importes, meses o entidades del total IGAE.</small><ul>{line.relatedSources.map(source => <li key={source.href}><a href={source.href} target={source.href.startsWith('#') ? undefined : '_blank'} rel={source.href.startsWith('#') ? undefined : 'noreferrer'}>{source.label}{source.href.startsWith('#') ? '' : ' ↗'}</a></li>)}</ul></details>}</span></span>
        <div className="allocation-control">
          <div className="allocation-quick-actions"><button type="button" onClick={() => onSetLine(index, 0)} aria-label={`Asignar cero euros a ${line.label}`}>0 €</button><button type="button" onClick={() => onSetLine(index, line.amount)} aria-label={`Volver al gasto oficial de ${line.label}`}>Usar cifra oficial</button></div>
          <span className="range-wrap"><input id={`range-${line.id}`} type="range" min="0" max={Math.max(0, Math.floor(budget))} step="1" value={amounts[index]} onChange={event => onSetLine(index, Number(event.target.value))} aria-label={`Presupuesto para ${line.label}: ${formatMillions(amounts[index])}; máximo ${formatMillions(budget)}. Marca: dato oficial ${formatMillions(line.amount)}`}/><i className="official-range-marker" style={{ left: `calc(${officialPosition}% + ${markerOffset}px)` }} title={`Dato oficial observado: ${formatMillions(line.amount)}`} aria-hidden="true"/></span>
        </div>
        <span className="allocation-value"><span className="allocation-number"><input type="number" min="0" max={budget} step="1" inputMode="numeric" value={drafts[index] ?? String(amounts[index])} onChange={event => onDraftChange(index, event.target.value)} onBlur={() => onCommitDraft(index)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onCommitDraft(index); event.currentTarget.blur(); } }} aria-label={`Importe para ${line.label} en millones de euros`}/><small>M€</small></span>{Math.abs(delta) >= 1 && <small className={`allocation-delta ${delta > 0 ? 'positive' : 'negative'}`}>{delta > 0 ? '+' : '−'}{formatMillions(Math.abs(delta))} vs. dato oficial</small>}</span>
      </div>;
    })}</div>
  </article>;
}
