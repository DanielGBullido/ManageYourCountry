import { dashboardData } from './lib/dashboard-data';
import SiteHeader from './components/layout/SiteHeader';
import SiteFooter from './components/layout/PageFooter';
import HeroSection from './components/sections/HeroSection';
import BudgetSection from './components/sections/BudgetSection';
import PeopleSection from './components/sections/PeopleSection';
import RegionsSection from './components/sections/RegionsSection';
import MethodologySection from './components/sections/MethodologySection';
import SourcesSection from './components/sections/SourcesSection';
import SectionDirectory from './components/sections/SectionDirectory';

export default function Home() {
  return <>
    <SiteHeader />
    <main id="inicio">
      <HeroSection monthly={dashboardData.monthly} />
      <BudgetSection monthly={dashboardData.monthly} benefits={dashboardData.benefits} taxes={dashboardData.taxes} services={dashboardData.services} />
      <SectionDirectory />
      <PeopleSection data={dashboardData} />
      <RegionsSection regions={dashboardData.regions} />
      <MethodologySection monthly={dashboardData.monthly} />
      <SourcesSection data={dashboardData} />
    </main>
    <SiteFooter />
  </>;
}
