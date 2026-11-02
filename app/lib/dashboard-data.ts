import monthly from '../../data/igae-latest.json';
import benefits from '../../data/prestaciones-latest.json';
import people from '../../data/personas-trabajo-latest.json';
import jobs from '../../data/perfiles-empleo-latest.json';
import regions from '../../data/comunidades-autonomicas.json';
import taxes from '../../data/recaudacion-tributaria-2025.json';
import services from '../../data/gasto-funcional-2024.json';
import demographics from '../../data/demografia-nacionalidad-latest.json';
import igaeProvenance from '../../data/provenance/igae-latest.json';

type IgaeProvenance = {
  sourceUrl: string;
  catalogUrl: string;
  referencePeriod: string;
  verifiedAt?: string;
  retrievedAt?: string;
  sha256: string | null;
  parser: string;
};

export const dashboardData = { monthly, benefits, people, jobs, regions, taxes, services, demographics, igaeProvenance: igaeProvenance as IgaeProvenance };
export type DashboardData = typeof dashboardData;
