const rowDefinitions = {
  revenueTotal: ['Recursos no financieros', 0],
  taxes: ['Impuestos', 0],
  contributions: ['Cotizaciones sociales', 0],
  transfersIn: ['Transferencias entre AAPP', 0],
  otherRevenue: ['Resto de recursos', 0],
  expenditureTotal: ['Empleos no financieros', 0],
  intermediate: ['Consumos intermedios', 0],
  wages: ['Remuneración de asalariados', 0],
  interest: ['Intereses', 0],
  subsidies: ['Subvenciones', 0],
  benefits: ['Prestaciones sociales distintas de las transferencias en especie', 0],
  inKind: ['Transferencias sociales en especie: producción adquirida en el mercado', 0],
  capital: ['Formación bruta de capital fijo', 0],
  transfersOut: ['Transferencias entre AAPP', 1],
  otherExpenditure: ['Resto de empleos', 0],
  financingBalance: ['Capacidad (+) o necesidad (-) de financiación', 0],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSpanishMillions(value) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error(`No se reconoce una cifra en millones: ${value}`);
  return number;
}

function extractRow(text, label, occurrence = 0) {
  const labelPattern = label.split(/\s+/).map(escapeRegExp).join('\\s+');
  const rowPattern = new RegExp(`(?:^|\\s)${labelPattern}\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+`, 'g');
  const matches = [...text.matchAll(rowPattern)];
  const match = matches[occurrence];
  if (!match) throw new Error(`No se encontró la fila IGAE «${label}» en la tabla mensual`);
  return parseSpanishMillions(match[2]); // La segunda columna es el mes del ejercicio vigente.
}

const hasLetters = line => /\p{L}/u.test(line);
const isFiguresOnly = line => /\d/.test(line) && /^[\s\d.,+\-%]+$/.test(line);

// Recent Poppler releases (26.x) place a wrapped row's figures on their own line
// between the two halves of its label:
//   Prestaciones sociales distintas de las
//                  21.031   22.435   6,7 ...
//   transferencias en especie
// Older releases print the figures after the second half. Rejoin the first form
// as \u00ablabel continuation figures\u00bb so both layouts read the same way.
export function joinWrappedLabels(pageText) {
  const lines = pageText.replace(/\u00a0/g, ' ').split(/\r?\n/);
  const joined = [];
  for (let index = 0; index < lines.length; index += 1) {
    const [label, figures, continuation] = [lines[index], lines[index + 1], lines[index + 2]];
    if (figures !== undefined && continuation !== undefined && hasLetters(label) && !/\d/.test(label)
      && isFiguresOnly(figures) && hasLetters(continuation) && !/\d/.test(continuation)) {
      joined.push(`${label.trim()} ${continuation.trim()} ${figures.trim()}`);
      index += 2;
    } else {
      joined.push(label);
    }
  }
  return joined.join('\n');
}

export function parseIgaeMonthlyPdfPage(pageText) {
  const text = joinWrappedLabels(pageText).replace(/\s+/g, ' ').trim();
  const amounts = Object.fromEntries(Object.entries(rowDefinitions).map(([key, [label, occurrence]]) => [key, extractRow(text, label, occurrence)]));
  const revenueTotal = amounts.revenueTotal;
  const expenditureTotal = amounts.expenditureTotal;
  const revenue = amounts.taxes + amounts.contributions + amounts.transfersIn + amounts.otherRevenue;
  const expenditure = amounts.intermediate + amounts.wages + amounts.interest + amounts.subsidies + amounts.benefits + amounts.inKind + amounts.capital + amounts.transfersOut + amounts.otherExpenditure;
  if (Math.abs(revenue - revenueTotal) > 1) throw new Error(`Los ingresos desglosados suman ${revenue}, pero la IGAE publica ${revenueTotal} M€`);
  if (Math.abs(expenditure - expenditureTotal) > 1) throw new Error(`Los gastos desglosados suman ${expenditure}, pero la IGAE publica ${expenditureTotal} M€`);
  if (Math.abs(revenueTotal - expenditureTotal - amounts.financingBalance) > 1) throw new Error('El saldo IGAE no coincide con ingresos menos gastos');
  return { ...amounts };
}
