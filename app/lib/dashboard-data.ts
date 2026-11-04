import periodData from '../../data/dashboard-periods.json';

type PeriodMap = typeof periodData;
export type DashboardPeriodSnapshot = PeriodMap[keyof PeriodMap];
export type DashboardData = Omit<DashboardPeriodSnapshot, 'period' | 'label'>;

export const dashboardPeriods = (Object.values(periodData) as DashboardPeriodSnapshot[])
  .sort((a, b) => b.period.localeCompare(a.period));

export const dashboardData: DashboardData = dashboardPeriods[0];

type PerPeriodKey = 'period' | 'label' | 'monthly' | 'igaeProvenance';
type SharedContext = Omit<DashboardPeriodSnapshot, PerPeriodKey>;
export type PackedSnapshots = { contexts: SharedContext[]; periods: (Pick<DashboardPeriodSnapshot, PerPeriodKey> & { context: number })[] };

/**
 * Archived months repeat the same auxiliary series (benefits, regions, population…).
 * Sending each distinct block once keeps the page payload small as months accumulate.
 */
export function packSnapshots(snapshots: DashboardPeriodSnapshot[]): PackedSnapshots {
  const contexts: SharedContext[] = [];
  const keys: string[] = [];
  const periods = snapshots.map(({ period, label, monthly, igaeProvenance, ...context }) => {
    const key = JSON.stringify(context);
    let index = keys.indexOf(key);
    if (index < 0) { index = keys.length; keys.push(key); contexts.push(context); }
    return { period, label, monthly, igaeProvenance, context: index };
  });
  return { contexts, periods };
}

export function unpackSnapshots({ contexts, periods }: PackedSnapshots): DashboardPeriodSnapshot[] {
  return periods.map(({ context, ...own }) => ({ ...contexts[context], ...own }) as DashboardPeriodSnapshot);
}
