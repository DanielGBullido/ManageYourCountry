import { readXlsx } from './xlsx-reader.mjs';
import { assertNear, listLinks, monthNumber, periodKey } from './official-import.mjs';

// Ministerio de Trabajo y Economía Social · Estadística de Prestaciones por
// Desempleo (PRD), elaborada con los registros del SEPE. Cada libro mensual
// prd_MM_AA.xlsx trae, mes a mes del año en curso y del anterior:
// - PRD-E1: beneficiarios el último día del mes y tasa de cobertura;
// - PRD-E2: gasto en miles de euros, cotizaciones a la Seguridad Social incluidas.
// El gasto va un mes por detrás: el libro de septiembre trae beneficiarios de
// septiembre pero gasto hasta agosto. Solo se dan por completos los meses con
// las dos tablas.

export const PRD_CATALOG_URL = 'https://www.mites.gob.es/es/estadisticas/prestaciones_SS_otra_proteccion/PRD/welcome.htm';
export const PRD_PARSER_VERSION = 'trabajo-prd@1';

export function listPrdWorkbooks(html, baseUrl = PRD_CATALOG_URL) {
  const seen = new Map();
  for (const href of listLinks(html, baseUrl)) {
    const match = href.match(/\/PRD\/prd(\d{2})_[a-z]{3}\/prd_(0[1-9]|1[0-2])_(\d{2})\.xlsx$/i);
    if (!match || match[1] !== match[3]) continue;
    const publication = periodKey(2000 + Number(match[3]), Number(match[2]));
    if (!seen.has(publication)) seen.set(publication, { publication, url: href });
  }
  return [...seen.values()].sort((a, b) => b.publication.localeCompare(a.publication));
}

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

function expectHeaders(rows, sheet, expected) {
  for (const [row, column, prefix] of expected) {
    if (!clean(rows[row - 1]?.[column]).toLocaleLowerCase('es').startsWith(prefix.toLocaleLowerCase('es'))) {
      throw new Error(`Cambió la cabecera de ${sheet}: se esperaba «${prefix}» en la fila ${row}, columna ${column + 1}`);
    }
  }
}

function monthlyRows(rows) {
  const result = new Map();
  let year = null;
  for (const row of rows) {
    const label = clean(row[0]);
    const yearLabel = label.match(/^(20\d{2}):$/);
    if (yearLabel) { year = Number(yearLabel[1]); continue; }
    const month = /^[A-Za-zÁÉÍÓÚáéíóú]+$/.test(label) ? monthNumber(label) : null;
    if (year && month && typeof row[1] === 'number') result.set(periodKey(year, month), row);
  }
  return result;
}

/** @param {Buffer} buffer */
export function parsePrdWorkbook(buffer) {
  const workbook = readXlsx(buffer);
  const beneficiariesSheet = workbook.sheet('PRD-E1');
  const spendingSheet = workbook.sheet('PRD-E2');
  expectHeaders(beneficiariesSheet, 'PRD-E1', [
    [3, 0, 'PRD-E1. Beneficiarios de prestaciones'], [6, 1, 'BENEFICIARIOS DE PRESTACIONES'], [6, 11, 'TASA DE COBERTURA'],
    [7, 1, 'TOTAL'], [7, 2, 'NIVEL CONTRIBUTIVO'], [7, 5, 'NIVEL ASISTENCIAL'], [7, 9, 'RENTA ACTIVA'], [7, 10, 'PROGRAMA DE ACTIVACIÓN'],
    [8, 2, 'Total'], [8, 3, 'Contributiva'], [8, 4, 'Trabajadores eventuales agrarios'], [8, 5, 'Total'], [8, 6, 'Subsidio'], [8, 7, 'Renta agraria'], [8, 8, 'Subsidio de trabajadores eventuales agrarios'],
  ]);
  expectHeaders(spendingSheet, 'PRD-E2', [
    [3, 0, 'PRD-E2. Gasto de prestaciones'], [5, 0, 'En miles de euros'], [6, 1, 'GASTO DE PRESTACIONES'],
    [7, 1, 'TOTAL'], [7, 2, 'NIVEL CONTRIBUTIVO'], [7, 3, 'NIVEL ASISTENCIAL'], [7, 6, 'RENTA ACTIVA'], [7, 7, 'PROGRAMA DE ACTIVACIÓN'],
    [8, 3, 'Total'], [8, 4, 'Subsidio'], [8, 5, 'Subsidio de trabajadores eventuales agrarios'],
  ]);
  if (!spendingSheet.flat().some(cell => /Los gastos incluyen las cotizaciones a la Seguridad Social/i.test(clean(cell)))) throw new Error('PRD-E2 ya no indica que el gasto incluye cotizaciones');

  const beneficiaries = monthlyRows(beneficiariesSheet);
  const spending = monthlyRows(spendingSheet);
  const months = [];
  for (const [period, row] of beneficiaries) {
    const cost = spending.get(period);
    if (!cost) continue;
    const people = {
      total: row[1], contributory: row[2], contributoryBenefit: row[3], contributoryAgricultural: row[4],
      assistance: row[5], subsidy: row[6], agriculturalIncome: row[7], agriculturalSubsidy: row[8],
      activeInsertionIncome: row[9], activationProgramme: row[10],
    };
    const thousands = {
      total: cost[1], contributory: cost[2], assistance: cost[3], subsidy: cost[4], agriculturalSubsidy: cost[5],
      activeInsertionIncome: cost[6], activationProgramme: cost[7],
    };
    assertNear(people.contributory + people.assistance + people.activeInsertionIncome + people.activationProgramme, people.total, 0, `Beneficiarios PRD por nivel (${period})`);
    assertNear(people.contributoryBenefit + people.contributoryAgricultural, people.contributory, 0, `Beneficiarios de nivel contributivo (${period})`);
    assertNear(people.subsidy + people.agriculturalIncome + people.agriculturalSubsidy, people.assistance, 0, `Beneficiarios de nivel asistencial (${period})`);
    assertNear(thousands.contributory + thousands.assistance + thousands.activeInsertionIncome + thousands.activationProgramme, thousands.total, 0.05, `Gasto PRD por nivel (${period})`);
    assertNear(thousands.subsidy + thousands.agriculturalSubsidy, thousands.assistance, 0.05, `Gasto de nivel asistencial (${period})`);
    const coverageRate = row[11];
    if (!(coverageRate > 0 && coverageRate < 200)) throw new Error(`Tasa de cobertura no válida en ${period}`);
    months.push({
      period,
      values: {
        beneficiaries: people,
        spendingThousands: Object.fromEntries(Object.entries(thousands).map(([key, value]) => [key, Math.round(value * 100) / 100])),
        coverageRate,
        averageContributoryEurosPerMonth: cost[8],
      },
    });
  }
  if (!months.length) throw new Error('El libro PRD no contiene ningún mes con beneficiarios y gasto');
  return months.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Gasto medio mensual por persona beneficiaria sin el subsidio de trabajadores
 * eventuales agrarios, el mismo cálculo que difunde el Ministerio de Trabajo.
 */
export function averageSpendingPerBeneficiary(values) {
  const spending = values.spendingThousands.total - values.spendingThousands.agriculturalSubsidy;
  const people = values.beneficiaries.total - values.beneficiaries.agriculturalSubsidy;
  return spending * 1000 / people;
}
