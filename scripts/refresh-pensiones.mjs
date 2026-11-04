import { PENSIONS_CATALOG_URL, PENSIONS_PARSER_VERSION, findPensionSeriesWorkbook, parsePensionSeriesWorkbook } from './lib/seguridad-social-pensions.mjs';
import { fetchOfficial, formatNumber, monthName, round, runMonthlyImport, sha256, shortLabel, splitPeriod, writeBenefitItem } from './lib/official-import.mjs';

// Pensiones contributivas (ficha «pensions» de data/prestaciones-latest.json)
// desde el libro oficial «Series de pensiones en vigor» de la Seguridad Social.

const detailLabels = [
  ['retirement', 'Jubilación'],
  ['widowhood', 'Viudedad'],
  ['permanentDisability', 'Incapacidad permanente'],
  ['orphanhood', 'Orfandad'],
  ['family', 'A favor de familiares'],
];
const millions = thousands => round(thousands / 1000, 1);

await runMonthlyImport({
  source: 'seguridad-social-pensiones',
  label: 'Pensiones contributivas (Seguridad Social)',
  async download() {
    const workbook = findPensionSeriesWorkbook(await fetchOfficial(PENSIONS_CATALOG_URL, { timeout: 30_000 }));
    const buffer = await fetchOfficial(workbook.url, { kind: 'xlsx' });
    const hash = sha256(buffer);
    return parsePensionSeriesWorkbook(buffer).map(({ period, values }) => ({
      referencePeriod: period,
      periodLabel: shortLabel(period),
      unit: 'número de pensiones; importe mensual en miles de euros; pensión media en euros al mes',
      measure: 'Pensiones contributivas en vigor el día 1 del mes (nómina mensual) · hoja S_Total, total del sistema',
      values,
      provenance: { sourceUrl: workbook.url, catalogUrl: PENSIONS_CATALOG_URL, sha256: hash, parser: PENSIONS_PARSER_VERSION, table: `Series de pensiones en vigor (S${workbook.publication.replace('-', '')}.xlsx) · S_Total` },
    }));
  },
  async write(record) {
    const { total, retirement } = record.values;
    const { month } = splitPeriod(record.referencePeriod);
    await writeBenefitItem({
      id: 'pensions',
      period: record.periodLabel,
      amountMillions: millions(total.amountThousands),
      summary: `${formatNumber(total.pensions)} pensiones contributivas en vigor en la nómina de ${monthName(month)}; la pensión media del sistema fue de ${formatNumber(total.averageEuros, 2)} € al mes.`,
      source: 'Seguridad Social · Estadísticas de pensiones en vigor',
      sourceUrl: record.provenance.sourceUrl,
      details: detailLabels.map(([key, label]) => ({ label, amountMillions: millions(record.values[key].amountThousands) })),
      secondary: `La pensión media de jubilación fue de ${formatNumber(retirement.averageEuros, 2)} € al mes. El importe es la nómina mensual de las pensiones en vigor el 1 de ${monthName(month)}.`,
    });
    return `${formatNumber(total.pensions)} pensiones; ${millions(total.amountThousands)} M€`;
  },
});
