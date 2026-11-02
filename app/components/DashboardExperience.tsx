'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DashboardPeriodSnapshot } from '../lib/dashboard-data';
import SiteHeader from './layout/SiteHeader';
import PageFooter from './layout/PageFooter';
import HeroSection from './sections/HeroSection';
import BudgetSection from './sections/BudgetSection';
import PeopleSection from './sections/PeopleSection';
import RegionsSection from './sections/RegionsSection';
import MethodologySection from './sections/MethodologySection';
import SourcesSection from './sections/SourcesSection';
import SectionDirectory from './sections/SectionDirectory';
import type publicDebtHistoryData from '../../data/public-debt-history-2026.json';

export default function DashboardExperience({ snapshots, publicDebtHistory }: { snapshots: DashboardPeriodSnapshot[]; publicDebtHistory: typeof publicDebtHistoryData }) {
  const [period, setPeriod] = useState(snapshots[0]?.period ?? '');
  const selected = useMemo(() => snapshots.find(snapshot => snapshot.period === period) ?? snapshots[0], [snapshots, period]);
  const availablePeriods = useMemo(() => snapshots.map(snapshot => ({ period: snapshot.period, label: snapshot.label })), [snapshots]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('mes');
    if (requested && snapshots.some(snapshot => snapshot.period === requested)) setPeriod(requested);
  }, [snapshots]);

  function changePeriod(nextPeriod: string) {
    if (!snapshots.some(snapshot => snapshot.period === nextPeriod)) return;
    setPeriod(nextPeriod);
    const url = new URL(window.location.href);
    url.searchParams.set('mes', nextPeriod);
    // An allocation belongs to its reference month. Changing month starts a clean scenario.
    url.searchParams.delete('reparto');
    window.history.replaceState(null, '', url);
  }

  if (!selected) return null;
  const selectedDebtIndex = publicDebtHistory.months.findIndex(item => item.referencePeriod === period);
  const selectedDebt = publicDebtHistory.months[selectedDebtIndex] ?? publicDebtHistory.months.at(-1);
  if (!selectedDebt) return null;
  const previousDebt = selectedDebtIndex > 0 ? publicDebtHistory.months[selectedDebtIndex - 1] : publicDebtHistory.previousMonth;
  const debtChangeMillions = selectedDebt.amountMillions - previousDebt.amountMillions;
  const { monthly, benefits, people, jobs, regions, taxes, services, demographics, igaeProvenance } = selected;
  const data = { monthly, benefits, people, jobs, regions, taxes, services, demographics, igaeProvenance };

  return <>
    <SiteHeader />
    <main id="inicio">
      <HeroSection monthly={monthly} publicDebt={{ ...publicDebtHistory, ...selectedDebt, previousPeriodLabel: previousDebt.periodLabel, changeMillions: debtChangeMillions }} selectedPeriod={period} availablePeriods={availablePeriods} onPeriodChange={changePeriod}/>
      <BudgetSection data={data} key={period}/>
      <SectionDirectory />
      <PeopleSection data={data}/>
      <RegionsSection regions={regions}/>
      <MethodologySection monthly={monthly}/>
      <SourcesSection data={data}/>
    </main>
    <PageFooter />
  </>;
}
