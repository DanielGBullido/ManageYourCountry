import { IMV_CATALOG_URL, IMV_PARSER_VERSION, findImvPayrollWorkbook, listImvArticles, parseImvPayrollWorkbook } from './lib/inss-imv.mjs';
import { fetchOfficial, formatNumber, round, runMonthlyImport, sha256, shortLabel, writeBenefitItem } from './lib/official-import.mjs';

// Ingreso Mínimo Vital (ficha «imv») desde el libro mensual de nómina del INSS.

const maxArticles = 8;

await runMonthlyImport({
  source: 'inss-imv',
  label: 'Ingreso Mínimo Vital (INSS)',
  async download(panel) {
    const articles = listImvArticles(await fetchOfficial(IMV_CATALOG_URL, { timeout: 30_000 })).slice(0, maxArticles);
    const workbooks = new Map();
    for (const articleUrl of articles) {
      const found = findImvPayrollWorkbook(await fetchOfficial(articleUrl, { timeout: 30_000 }), articleUrl);
      if (found && !workbooks.has(found.period)) workbooks.set(found.period, { ...found, articleUrl });
    }
    if (!workbooks.size) throw new Error(`Ninguna de las ${articles.length} notas recientes de ${IMV_CATALOG_URL} enlaza un libro «AAAAMM_IMV - Nómina.xlsx»`);
    const newest = [...workbooks.keys()].sort().at(-1);
    const wanted = [...workbooks.values()].filter(item => item.period >= panel || item.period === newest);
    const records = [];
    for (const workbook of wanted) {
      const buffer = await fetchOfficial(workbook.url, { kind: 'xlsx' });
      records.push({
        referencePeriod: workbook.period,
        periodLabel: shortLabel(workbook.period),
        unit: 'hogares (prestaciones), personas beneficiarias y euros (importe bruto de la nómina)',
        measure: 'Nómina mensual del IMV · fila TOTAL',
        values: parseImvPayrollWorkbook(buffer, workbook.period),
        provenance: { sourceUrl: workbook.url, catalogUrl: workbook.articleUrl, sha256: sha256(buffer), parser: IMV_PARSER_VERSION, table: `${workbook.period.replace('-', '')}_IMV - Nómina.xlsx · hoja Nómina · fila TOTAL` },
      });
    }
    return records;
  },
  async write(record) {
    const value = record.values;
    await writeBenefitItem({
      id: 'imv',
      period: record.periodLabel,
      amountMillions: round(value.amountEuros / 1e6, 1),
      summary: `${formatNumber(value.households)} hogares y ${formatNumber(value.beneficiaries)} personas beneficiarias; ${formatNumber(value.averagePerHousehold, 1)} € al mes de media por hogar (sin atrasos).`,
      source: 'Instituto Nacional de la Seguridad Social',
      sourceUrl: record.provenance.sourceUrl,
      details: [],
      secondary: `${formatNumber(value.capiHouseholds)} hogares recibieron también el Complemento de Ayuda para la Infancia; ya están dentro de las cifras del IMV y no se suman aparte. El importe bruto de la nómina incluye atrasos.`,
    });
    return `${formatNumber(value.households)} hogares; ${round(value.amountEuros / 1e6, 1)} M€`;
  },
});
