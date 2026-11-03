'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DashboardData } from '../../../lib/dashboard-data';
import { buildBudgetGradient, decodeScenario, encodeScenario, fitAmountsToBudget, getScenarioBalance, getScenarioDeficit, getUnallocatedBudget, setBudgetLineAmount, type BudgetLine } from '../../../lib/budget-scenario';
import { formatMillions } from '../../../lib/format';
import AllocationPanel from './AllocationPanel';
import ScenarioOverview from './ScenarioOverview';

export default function BudgetSimulator({ monthly, isYearToDate = false }: { monthly: DashboardData['monthly']; isYearToDate?: boolean }) {
  const lines = monthly.expenditure as BudgetLine[];
  const budget = monthly.revenueTotal;
  const [amounts, setAmounts] = useState<number[]>(() => lines.map(() => 0));
  const [drafts, setDrafts] = useState<string[]>(() => lines.map(() => '0'));
  const [allowDeficit, setAllowDeficit] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedDeficit = params.get('deficit') === '1';
    const sharedAmounts = decodeScenario(params.get('reparto'), lines, budget, { allowDeficit: sharedDeficit });
    if (sharedAmounts) {
      setAllowDeficit(sharedDeficit);
      setAmounts(sharedAmounts);
      setDrafts(sharedAmounts.map(String));
    }
  }, [budget, lines]);
  const spent = amounts.reduce((sum, amount) => sum + amount, 0);
  const unallocated = getUnallocatedBudget(amounts, budget);
  const deficit = getScenarioDeficit(amounts, budget);
  const balance = getScenarioBalance(amounts, budget);
  const gradient = useMemo(() => buildBudgetGradient(lines, amounts, budget), [lines, amounts, budget]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }

  function apply(next: number[]) {
    setAmounts(next);
    setDrafts(next.map(String));
  }

  function setLine(index: number, amount: number) {
    apply(setBudgetLineAmount(amounts, index, amount, budget, { allowDeficit }));
  }

  function commitDraft(index: number) {
    const value = Number(drafts[index]);
    if (drafts[index].trim() === '' || !Number.isFinite(value)) {
      setDrafts(amounts.map(String));
      return;
    }
    setLine(index, value);
  }

  function resetOfficial() {
    const official = lines.map(line => line.amount);
    // The official figure can itself be a deficit. Show it as it was, not trimmed.
    if (official.reduce((sum, amount) => sum + amount, 0) > budget && !allowDeficit) {
      setAllowDeficit(true);
      flash('El gasto oficial superó los ingresos: se ha activado «Permitir déficit» para mostrarlo completo.');
    }
    apply(official);
  }

  function setAllZero() {
    apply(lines.map(() => 0));
  }

  function toggleDeficit(next: boolean) {
    setAllowDeficit(next);
    if (!next && spent > budget) {
      apply(fitAmountsToBudget(amounts, budget));
      flash('Sin déficit, todas las partidas se han reducido en proporción para caber en los ingresos.');
    }
  }

  async function share() {
    const breakdown = lines.map((line, index) => `${line.label}: ${formatMillions(amounts[index])}`).join(' · ');
    const closing = deficit > 0 ? `Déficit: ${formatMillions(deficit)}` : `Sin repartir: ${formatMillions(unallocated)}`;
    const text = `Mi escenario de gasto público para ${monthly.periodLabel}: ${breakdown} · ${closing}`;
    const url = new URL(window.location.href);
    url.searchParams.set('reparto', encodeScenario(lines, amounts));
    if (allowDeficit) url.searchParams.set('deficit', '1');
    else url.searchParams.delete('deficit');
    try {
      if (navigator.share) await navigator.share({ title: 'Mi escenario de gasto público', text, url: url.toString() });
      else {
        await navigator.clipboard.writeText(`${text} — ${url.toString()}`);
        flash('Escenario copiado al portapapeles.');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') flash('No se pudo compartir el escenario.');
    }
  }

  return <>
    <div className="dashboard-grid">
      <AllocationPanel lines={lines} amounts={amounts} drafts={drafts} budget={budget} periodLabel={monthly.periodLabel} isYearToDate={isYearToDate}
        allowDeficit={allowDeficit} spent={spent} unallocated={unallocated} deficit={deficit}
        onToggleDeficit={toggleDeficit}
        onSetLine={setLine}
        onDraftChange={(index, value) => setDrafts(current => current.map((draft, i) => i === index ? value : draft))}
        onCommitDraft={commitDraft} onSetAllZero={setAllZero} onResetOfficial={resetOfficial} onShare={share} />
      <ScenarioOverview monthly={monthly} lines={lines} amounts={amounts} spent={spent} unallocated={unallocated} deficit={deficit} balance={balance} gradient={gradient} isYearToDate={isYearToDate} />
    </div>
    <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">{toast}</div>
  </>;
}
