import DashboardExperience from './components/DashboardExperience';
import { dashboardPeriods } from './lib/dashboard-data';
import publicDebt from '../data/public-debt-latest.json';

export default function Home() {
  return <DashboardExperience snapshots={dashboardPeriods} publicDebt={publicDebt}/>;
}
