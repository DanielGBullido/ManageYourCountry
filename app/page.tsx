import type { Metadata } from 'next';
import DashboardExperience from './components/DashboardExperience';
import { dashboardPeriods, packSnapshots } from './lib/dashboard-data';
import { buildShareSummary } from './lib/share-summary';
import publicDebtHistory from '../data/public-debt-history-2026.json';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

// Each shared link (month, view, scenario) gets its own preview title, text and image.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const raw = await searchParams;
  const params = { mes: first(raw.mes), vista: first(raw.vista), reparto: first(raw.reparto), deficit: first(raw.deficit) };
  const summary = buildShareSummary(params);
  const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const image = `/og${query.size ? `?${query}` : ''}`;
  return {
    openGraph: { type: 'website', locale: 'es_ES', siteName: 'España en tus manos', title: summary.headline, description: summary.description, images: [{ url: image, width: 1200, height: 630, alt: summary.description }] },
    twitter: { card: 'summary_large_image', title: summary.headline, description: summary.description, images: [image] },
  };
}

export default function Home() {
  return <DashboardExperience packed={packSnapshots(dashboardPeriods)} publicDebtHistory={publicDebtHistory}/>;
}
