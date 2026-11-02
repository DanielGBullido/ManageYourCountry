import periodData from '../../data/dashboard-periods.json';

type PeriodMap = typeof periodData;
export type DashboardPeriodSnapshot = PeriodMap[keyof PeriodMap];
export type DashboardData = Omit<DashboardPeriodSnapshot, 'period' | 'label'>;

export const dashboardPeriods = (Object.values(periodData) as DashboardPeriodSnapshot[])
  .sort((a, b) => b.period.localeCompare(a.period));

export const dashboardData: DashboardData = dashboardPeriods[0];
