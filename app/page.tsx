import DashboardExperience from './components/DashboardExperience';
import { dashboardPeriods } from './lib/dashboard-data';
import publicDebtHistory from '../data/public-debt-history-2026.json';

export default function Home() {
  return <DashboardExperience snapshots={dashboardPeriods} publicDebtHistory={publicDebtHistory}/>;
}
