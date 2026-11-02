const catalogUrl = 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/DatosConsolidados.aspx';

export function findLatestReport(page) {
  const reports = [...page.matchAll(/href=["']([^"']*\/AAPP-M\/IM_(\d{4})_(\d{2})\.pdf)["']/gi)]
    .map(match => ({ href: match[1].replaceAll('&amp;', '&'), year: Number(match[2]), month: Number(match[3]) }))
    .filter(report => report.month >= 1 && report.month <= 12)
    .sort((a, b) => b.year - a.year || b.month - a.month);
  if (!reports.length) throw new Error('No se encontró un informe mensual IM_YYYY_MM.pdf en el catálogo oficial IGAE');
  const latest = reports[0];
  return { ...latest, url: new URL(latest.href, catalogUrl).toString() };
}
