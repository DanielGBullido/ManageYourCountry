import DashboardExperience from './components/DashboardExperience';
import { dashboardPeriods } from './lib/dashboard-data';

export default function Home() {
  return <DashboardExperience snapshots={dashboardPeriods}/>;
}
