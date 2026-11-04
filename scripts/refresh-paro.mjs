import { PRD_CATALOG_URL, PRD_PARSER_VERSION, averageSpendingPerBeneficiary, listPrdWorkbooks, parsePrdWorkbook } from './lib/prd-unemployment.mjs';
import { fetchOfficial, formatNumber, round, runMonthlyImport, sha256, shortLabel, writeBenefitItem } from './lib/official-import.mjs';

// Prestaciones por desempleo (ficha «unemployment») desde la Estadística de
// Prestaciones por Desempleo (PRD) del Ministerio de Trabajo, con datos del SEPE.

await runMonthlyImport({
  source: 'sepe-prd',
  label: 'Prestaciones por desempleo (Trabajo · SEPE)',
  async download() {
    const [latest] = listPrdWorkbooks(await fetchOfficial(PRD_CATALOG_URL, { timeout: 30_000 }));
    if (!latest) throw new Error(`No se encontró ningún libro prd_MM_AA.xlsx en ${PRD_CATALOG_URL}`);
    const buffer = await fetchOfficial(latest.url, { kind: 'xlsx' });
    const hash = sha256(buffer);
    return parsePrdWorkbook(buffer).map(({ period, values }) => ({
      referencePeriod: period,
      periodLabel: shortLabel(period),
      unit: 'personas beneficiarias el último día del mes; gasto en miles de euros',
      measure: 'PRD-E1 (beneficiarios y tasa de cobertura) y PRD-E2 (gasto con cotizaciones a la Seguridad Social)',
      values,
      provenance: { sourceUrl: latest.url, catalogUrl: PRD_CATALOG_URL, sha256: hash, parser: PRD_PARSER_VERSION, table: `prd_${latest.publication.slice(5)}_${latest.publication.slice(2, 4)}.xlsx · PRD-E1 y PRD-E2` },
    }));
  },
  async write(record) {
    const value = record.values;
    const amountMillions = round(value.spendingThousands.total / 1000, 2);
    await writeBenefitItem({
      id: 'unemployment',
      period: record.periodLabel,
      amountMillions,
      summary: `${formatNumber(value.beneficiaries.total)} personas beneficiarias; gasto medio de ${formatNumber(averageSpendingPerBeneficiary(value), 1)} € al mes por persona (sin subsidio agrario).`,
      source: 'Ministerio de Trabajo y Economía Social · SEPE',
      sourceUrl: record.provenance.sourceUrl,
      details: [],
      secondary: `La cobertura del sistema fue del ${formatNumber(value.coverageRate, 2)}%. El gasto incluye las cotizaciones a la Seguridad Social y se publica un mes después que el número de beneficiarios.`,
    });
    return `${formatNumber(value.beneficiaries.total)} personas; ${amountMillions} M€`;
  },
});
