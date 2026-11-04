'use client';

import { useEffect, useMemo, useState } from 'react';
import { unpackSnapshots, type PackedSnapshots } from '../lib/dashboard-data';
import SiteHeader from './layout/SiteHeader';
import PageFooter from './layout/PageFooter';
import HeroSection from './sections/HeroSection';
import BudgetSection from './sections/BudgetSection';
import PeopleSection from './sections/PeopleSection';
import RegionsSection from './sections/RegionsSection';
import MethodologySection from './sections/MethodologySection';
import SourcesSection from './sections/SourcesSection';
import SectionDirectory from './sections/SectionDirectory';
import ContextSection from './sections/ContextSection';
import { buildYearToDate, type BudgetView } from '../lib/year-to-date';
import type publicDebtHistoryData from '../../data/public-debt-history-2026.json';

export default function DashboardExperience({ packed, publicDebtHistory }: { packed: PackedSnapshots; publicDebtHistory: typeof publicDebtHistoryData }) {
  const snapshots = useMemo(() => unpackSnapshots(packed), [packed]);
  const [period, setPeriod] = useState(snapshots[0]?.period ?? '');
  const selected = useMemo(() => snapshots.find(snapshot => snapshot.period === period) ?? snapshots[0], [snapshots, period]);
  const availablePeriods = useMemo(() => snapshots.map(snapshot => ({ period: snapshot.period, label: snapshot.label })), [snapshots]);
  const [view, setView] = useState<BudgetView>('month');
  const yearToDate = useMemo(() => buildYearToDate(snapshots.map(snapshot => snapshot.monthly), period), [snapshots, period]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('mes');
    if (requested && snapshots.some(snapshot => snapshot.period === requested)) setPeriod(requested);
    if (params.get('vista') === 'acumulado') setView('ytd');
    if (params.get('vista') === 'funciones') setView('functions');
  }, [snapshots]);

  function changeView(nextView: BudgetView) {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === 'ytd') url.searchParams.set('vista', 'acumulado');
    else if (nextView === 'functions') url.searchParams.set('vista', 'funciones');
    else url.searchParams.delete('vista');
    // A shared allocation belongs to one period and view; switching starts clean.
    url.searchParams.delete('reparto');
    url.searchParams.delete('deficit');
    window.history.replaceState(null, '', url);
  }

  function changePeriod(nextPeriod: string) {
    if (!snapshots.some(snapshot => snapshot.period === nextPeriod)) return;
    setPeriod(nextPeriod);
    const url = new URL(window.location.href);
    url.searchParams.set('mes', nextPeriod);
    // An allocation belongs to its reference month. Changing month starts a clean scenario.
    url.searchParams.delete('reparto');
    url.searchParams.delete('deficit');
    window.history.replaceState(null, '', url);
  }

  if (!selected) return null;
  // Monthly debt is only loaded from January 2026: earlier months show no debt card
  // rather than another month's figure.
  const selectedDebtIndex = publicDebtHistory.months.findIndex(item => item.referencePeriod === selected.period);
  const selectedDebt = selectedDebtIndex >= 0 ? publicDebtHistory.months[selectedDebtIndex] : null;
  const previousDebt = selectedDebtIndex > 0 ? publicDebtHistory.months[selectedDebtIndex - 1] : publicDebtHistory.previousMonth;
  const debt = selectedDebt ? { ...publicDebtHistory, ...selectedDebt, previousPeriodLabel: previousDebt.periodLabel, changeMillions: selectedDebt.amountMillions - previousDebt.amountMillions } : null;
  const [selectedYear, selectedMonth] = selected.period.split('-');
  const sameMonthLastYear = snapshots.find(snapshot => snapshot.period === `${Number(selectedYear) - 1}-${selectedMonth}`)?.monthly ?? null;
  const firstDebtLabel = publicDebtHistory.months[0]?.periodLabel ?? '';
  const { monthly, benefits, people, jobs, regions, taxes, services, demographics, igaeProvenance } = selected;
  const data = { monthly, benefits, people, jobs, regions, taxes, services, demographics, igaeProvenance };

  return <>
    <SiteHeader />
    <main id="inicio">
      <HeroSection monthly={monthly} publicDebt={debt} firstDebtLabel={firstDebtLabel} previousYear={sameMonthLastYear} selectedPeriod={selected.period} availablePeriods={availablePeriods} onPeriodChange={changePeriod}/>
      <BudgetSection data={data} view={view} yearToDate={yearToDate} onViewChange={changeView} key={`${period}-${view}`}/>
      <SectionDirectory />
      <PeopleSection data={data}/>
      <RegionsSection regions={regions}/>
      <ContextSection/>
      <MethodologySection monthly={monthly}/>
      <SourcesSection data={data}/>
    </main>
    <PageFooter />
  </>;
}
