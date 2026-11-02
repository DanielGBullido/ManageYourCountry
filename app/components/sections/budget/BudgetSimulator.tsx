'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DashboardData } from '../../../lib/dashboard-data';
import { buildBudgetGradient, decodeScenario, encodeScenario, getUnallocatedBudget, setBudgetLineAmount, type BudgetLine } from '../../../lib/budget-scenario';
import { formatMillions } from '../../../lib/format';
import AllocationPanel from './AllocationPanel';
import ScenarioOverview from './ScenarioOverview';

export default function BudgetSimulator({ monthly }: { monthly: DashboardData['monthly'] }) {
  const lines = monthly.expenditure as BudgetLine[];
  const budget = monthly.revenueTotal;
  const [amounts, setAmounts] = useState<number[]>(() => lines.map(() => 0));
  const [drafts, setDrafts] = useState<string[]>(() => lines.map(() => '0'));
  const [toast, setToast] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedAmounts = decodeScenario(params.get('reparto'), lines, budget);
    if (sharedAmounts) {
      setAmounts(sharedAmounts);
      setDrafts(sharedAmounts.map(String));
    }
  }, [budget, lines]);
  const spent = amounts.reduce((sum, amount) => sum + amount, 0);
  const unallocated = getUnallocatedBudget(amounts, budget);
  const gradient = useMemo(() => buildBudgetGradient(lines, amounts, budget), [lines, amounts, budget]);

  function setLine(index: number, amount: number) {
    const next = setBudgetLineAmount(amounts, index, amount, budget);
    setAmounts(next);
    setDrafts(next.map(String));
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
    const next = lines.map(line => line.amount);
    setAmounts(next);
    setDrafts(next.map(String));
  }

  function setAllZero() {
    const next = lines.map(() => 0);
    setAmounts(next);
    setDrafts(next.map(String));
  }

  async function share() {
    const breakdown = lines.map((line, index) => `${line.label}: ${formatMillions(amounts[index])}`).join(' · ');
    const text = `Mi escenario de gasto público para ${monthly.periodLabel}: ${breakdown} · Sin repartir: ${formatMillions(unallocated)}`;
    const url = new URL(window.location.href);
    url.searchParams.set('reparto', encodeScenario(lines, amounts));
    try {
      if (navigator.share) await navigator.share({ title: 'Mi escenario de gasto público', text, url: url.toString() });
      else {
        await navigator.clipboard.writeText(`${text} — ${url.toString()}`);
        setToast('Escenario copiado al portapapeles.');
        window.setTimeout(() => setToast(''), 2600);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setToast('No se pudo compartir el escenario.');
        window.setTimeout(() => setToast(''), 2600);
      }
    }
  }

  return <>
    <div className="dashboard-grid">
      <AllocationPanel lines={lines} amounts={amounts} drafts={drafts} budget={budget} periodLabel={monthly.periodLabel}
        onSetLine={setLine}
        onDraftChange={(index, value) => setDrafts(current => current.map((draft, i) => i === index ? value : draft))}
        onCommitDraft={commitDraft} onSetAllZero={setAllZero} onResetOfficial={resetOfficial} onShare={share} />
      <ScenarioOverview monthly={monthly} lines={lines} amounts={amounts} spent={spent} unallocated={unallocated} gradient={gradient} />
    </div>
    <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">{toast}</div>
  </>;
}
