import { PNC_CATALOG_URL, PNC_PARSER_VERSION, findPncWorkbook, parsePncWorkbook } from './lib/imserso-pnc.mjs';
import { fetchOfficial, formatNumber, monthName, round, runMonthlyImport, sha256, shortLabel, splitPeriod, writeBenefitItem } from './lib/official-import.mjs';

// Pensiones no contributivas (ficha «non-contributory-pensions») desde el
// Anexo 1 «Evolución de las nóminas» del Imserso.

await runMonthlyImport({
  source: 'imserso-pnc',
  label: 'Pensiones no contributivas (Imserso)',
  async download() {
    const url = findPncWorkbook(await fetchOfficial(PNC_CATALOG_URL, { timeout: 30_000 }));
    const buffer = await fetchOfficial(url, { kind: 'xlsx' });
    const hash = sha256(buffer);
    return parsePncWorkbook(buffer).map(({ period, values }) => ({
      referencePeriod: period,
      periodLabel: shortLabel(period),
      unit: 'euros (importe bruto de la nómina) y número de pensiones',
      measure: 'Nómina mensual de PNC de jubilación e incapacidad · total Estado con Navarra y País Vasco',
      values,
      provenance: { sourceUrl: url, catalogUrl: PNC_CATALOG_URL, sha256: hash, parser: PNC_PARSER_VERSION, table: 'evolpncs.xlsx · Anexo 1 · Evolución de las nóminas' },
    }));
  },
  async write(record) {
    const { retirement, disability, total, includesExtraPay } = record.values;
    const { month } = splitPeriod(record.referencePeriod);
    await writeBenefitItem({
      id: 'non-contributory-pensions',
      period: record.periodLabel,
      amountMillions: round(total.amountEuros / 1e6, 6),
      summary: `${formatNumber(total.pensions)} pensiones abonadas: ${formatNumber(retirement.pensions)} de jubilación y ${formatNumber(disability.pensions)} de incapacidad.`,
      source: 'Imserso · nómina mensual',
      sourceUrl: record.provenance.sourceUrl,
      details: [
        { label: 'Jubilación no contributiva', amountMillions: round(retirement.amountEuros / 1e6, 8) },
        { label: 'Incapacidad no contributiva', amountMillions: round(disability.amountEuros / 1e6, 8) },
      ],
      secondary: `Importe bruto abonado en ${monthName(month)}${includesExtraPay ? ', paga extraordinaria incluida' : ''}. Se financian con el Presupuesto del Estado y se pagan a través de la Seguridad Social.`,
    });
    return `${formatNumber(total.pensions)} pensiones; ${round(total.amountEuros / 1e6, 1)} M€`;
  },
});
