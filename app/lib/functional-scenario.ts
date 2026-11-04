import annualAccounts from '../../data/cuentas-anuales-aapp.json';
import type { DashboardData } from './dashboard-data';

type Monthly = DashboardData['monthly'];
type Services = DashboardData['services'];

// Everyday names for the ten COFOG functions; the official name stays in «Qué incluye».
export const everydayFunctionLabels: Record<string, string> = {
  general: 'Servicios generales (incluye los intereses de la deuda)',
  defence: 'Defensa',
  'public-order': 'Policía, justicia, prisiones y bomberos',
  economic: 'Transporte, energía, agricultura e industria',
  environment: 'Medio ambiente',
  housing: 'Vivienda, urbanismo, agua y alumbrado',
  health: 'Sanidad',
  'recreation-culture': 'Cultura, deporte y ocio',
  education: 'Educación',
  social: 'Pensiones, paro y otras ayudas sociales',
};

/** Eurostat COFOG codes (GF01…GF10) to the ids used in data/gasto-funcional-2024.json. */
export const functionIdsByCode: Record<string, string> = {
  GF01: 'general', GF02: 'defence', GF03: 'public-order', GF04: 'economic', GF05: 'environment',
  GF06: 'housing', GF07: 'health', GF08: 'recreation-culture', GF09: 'education', GF10: 'social',
};

export const functionalYear = annualAccounts.year;
export const functionalRevisionGap = annualAccounts.revisionGap;

/**
 * The «por funciones» view: one whole year for all public administrations
 * (ayuntamientos included), spending by purpose (COFOG) and revenue from the
 * same Eurostat release. Shaped like the monthly IGAE object so the simulator,
 * the dock and the money flow work unchanged.
 */
export function buildFunctionalScenario(base: Monthly, services: Services): Monthly {
  const revenueTotal = annualAccounts.revenueTotal;
  const expenditureTotal = services.items.reduce((sum, item) => sum + item.amount, 0);
  const revenueTemplate = (id: string) => base.revenue.find(item => item.id === id) ?? base.revenue[0];
  return {
    ...base,
    source: annualAccounts.source,
    sourceUrl: annualAccounts.sourceUrl,
    catalogUrl: annualAccounts.sourceUrl,
    referencePeriod: String(annualAccounts.year),
    periodLabel: `Año ${annualAccounts.year}`,
    scope: annualAccounts.scope,
    accountingBasis: annualAccounts.accountingBasis,
    periodType: 'Año completo',
    revenueTotal,
    expenditureTotal,
    financingBalance: revenueTotal - expenditureTotal,
    revenue: [
      { ...revenueTemplate('taxes'), id: 'taxes', label: 'Impuestos', officialLabel: 'Impuestos sobre la producción, la renta y el capital (D2 + D5 + D91)', description: 'IVA, IRPF, Sociedades, impuestos especiales y demás impuestos de todas las administraciones.', amount: annualAccounts.revenue.taxes },
      { ...revenueTemplate('contributions'), id: 'contributions', label: 'Cotizaciones sociales', officialLabel: 'Cotizaciones sociales netas (D61)', description: 'Lo que pagan empresas y trabajadores a la Seguridad Social y otros sistemas de protección.', amount: annualAccounts.revenue.contributions },
      { ...revenueTemplate('other'), id: 'other', label: 'Otros ingresos', officialLabel: 'Resto de recursos no financieros', description: 'Ventas, tasas, rentas de la propiedad, fondos europeos y otras transferencias.', amount: annualAccounts.revenue.other },
    ],
    expenditure: services.items.map(item => ({
      id: item.id,
      label: everydayFunctionLabels[item.id] ?? item.label,
      officialLabel: `${item.label} (COFOG)`,
      description: item.plainLabel,
      amount: item.amount,
      color: item.color,
    })) as Monthly['expenditure'],
  };
}
