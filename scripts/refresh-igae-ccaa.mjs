import { CCAA_CATALOG_URL, CCAA_PARSER_VERSION, listCcaaWorkbooks, parseCcaaWorkbook } from './lib/igae-ccaa.mjs';
import { fetchOfficial, longLabel, monthName, previousPeriod, readJson, runMonthlyImport, sha256, splitPeriod, writeJson } from './lib/official-import.mjs';

// Datos mensuales por comunidad autónoma (bloque igaeMonthly y columnas
// igaeMonthly* de data/comunidades-autonomicas.json) desde la serie mensual
// IGAE de la Administración regional.

const regionsFile = 'data/comunidades-autonomicas.json';
const longDate = isoDate => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));

await runMonthlyImport({
  source: 'igae-ccaa',
  label: 'Comunidades autónomas (IGAE)',
  async download(panel) {
    const workbooks = listCcaaWorkbooks(await fetchOfficial(CCAA_CATALOG_URL, { timeout: 30_000 }));
    const panelYear = splitPeriod(panel).year;
    const wanted = workbooks.filter(item => item.year >= panelYear);
    if (!wanted.length) throw new Error(`El catálogo IGAE regional no enlaza el libro de ${panelYear} ni posteriores`);
    const records = [];
    for (const workbook of wanted) {
      const buffer = await fetchOfficial(workbook.url, { kind: 'xlsx', timeout: 90_000 });
      const hash = sha256(buffer);
      for (const { period, values } of parseCcaaWorkbook(buffer)) {
        records.push({
          referencePeriod: period,
          periodLabel: longLabel(period),
          unit: 'millones de euros',
          measure: 'Flujo del mes por comunidad: acumulado del mes menos acumulado del mes anterior (enero: acumulado de enero)',
          values,
          provenance: { sourceUrl: workbook.url, catalogUrl: CCAA_CATALOG_URL, sha256: hash, parser: CCAA_PARSER_VERSION, table: `M_CCAA_Sub_Det_${workbook.year}.xlsx · Tabla2a a Tabla18a (millones de euros, acumulados)` },
        });
      }
    }
    return records;
  },
  async write(record) {
    const regions = await readJson(regionsFile);
    const byName = new Map(record.values.communities.map(item => [item.name, item]));
    if (byName.size !== regions.communities.length || regions.communities.some(item => !byName.has(item.name))) {
      throw new Error('Las comunidades del libro IGAE no coinciden con las de data/comunidades-autonomicas.json');
    }
    const { month } = splitPeriod(record.referencePeriod);
    const current = monthName(month);
    const previous = monthName(splitPeriod(previousPeriod(record.referencePeriod)).month);
    const flowSentence = month === 1
      ? 'El dato de enero es directamente el acumulado de enero.'
      : `El dato de ${current} se obtiene restando el acumulado de ${previous} al acumulado de ${current}.`;
    regions.period = regions.period.replace(/^.*?\(IGAE\)/, `${record.periodLabel} (IGAE)`);
    regions.igaeMonthly = {
      ...regions.igaeMonthly,
      period: record.periodLabel,
      sourceUrl: record.provenance.sourceUrl,
      catalogUrl: record.provenance.catalogUrl,
      updated: longDate(record.values.updatedOn),
      method: `La hoja ofrece cifras acumuladas hasta fin de mes. ${month === 1 ? 'El flujo de enero coincide con el acumulado de enero.' : `El flujo de ${current} se calcula restando el acumulado de ${previous} al acumulado de ${current}.`}`,
      expenditureDescription: `Gastos no financieros contabilizados por cada Administración regional. ${flowSentence}`,
      balanceDescription: `Diferencia calculada entre ingresos no financieros y gastos no financieros de ${current} según la cuenta de cada Administración regional; no es saldo bancario ni resultado de caja.`,
    };
    regions.communities = regions.communities.map(({ igaeAugustTax, igaeAugustRevenue, igaeAugustExpenditure, igaeAugustBalance, ...community }) => {
      const value = byName.get(community.name);
      return { ...community, igaeMonthlyTax: value.tax, igaeMonthlyRevenue: value.revenue, igaeMonthlyExpenditure: value.expenditure, igaeMonthlyBalance: value.balance };
    });
    await writeJson(regionsFile, regions);
    const sum = key => record.values.communities.reduce((total, item) => total + item[key], 0);
    return `17 comunidades; ingresos ${sum('revenue')} M€ y gastos ${sum('expenditure')} M€ (suma sin consolidar), actualización IGAE del ${longDate(record.values.updatedOn)}`;
  },
});
