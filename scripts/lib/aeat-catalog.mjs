export const AEAT_CATALOG_URL = 'https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Informe_mensual_de_Recaudacion_Tributaria.shtml';

// Enlaces del tipo .../Informes_mensuales_recaudacion_tributaria/2026/IMR_26_08_es_es.pdf
export function listAeatReports(page, baseUrl = AEAT_CATALOG_URL) {
  const seen = new Map();
  for (const match of page.matchAll(/href=["']([^"']*\/Informes_mensuales_recaudacion_tributaria\/(20\d{2})\/IMR_(\d{2})_(\d{2})_es_es\.pdf)["']/gi)) {
    const year = Number(match[2]);
    const month = Number(match[4]);
    if (Number(match[3]) !== year % 100 || month < 1 || month > 12) continue;
    const period = `${year}-${String(month).padStart(2, '0')}`;
    if (!seen.has(period)) seen.set(period, { period, year, month, url: new URL(match[1].replaceAll('&amp;', '&'), baseUrl).toString() });
  }
  return [...seen.values()].sort((a, b) => b.period.localeCompare(a.period));
}

export function findLatestAeatReport(page, baseUrl) {
  const reports = listAeatReports(page, baseUrl);
  if (!reports.length) throw new Error('No se encontró ningún informe IMR_AA_MM_es_es.pdf en el catálogo oficial de la AEAT');
  return reports[0];
}
