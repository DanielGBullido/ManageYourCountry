// Lee el texto (pdftotext -layout) del Informe mensual de recaudación tributaria
// de la AEAT y extrae los ingresos tributarios netos del mes.
//
// Fuente principal: Cuadro 1.1, bloque «MES DE <MES>», fila «TOTAL GENERAL»,
// columna «Total» del año en curso (millones de euros).
// Comprobación independiente: Cuadro 1.3, fila «TOTAL INGRESOS TRIBUTARIOS»,
// columna «TOTAL» del año en curso (miles de euros).
// Si alguna fila falta, las piezas no suman o las dos tablas no coinciden,
// el parser se detiene: no se publica una cifra dudosa.

export const AEAT_PARSER_VERSION = 'aeat-pdf-parser@1';

const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const fold = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

export function aeatMonthName(month) {
  const name = monthNames[month - 1];
  if (!name) throw new Error(`Mes no válido: ${month}`);
  return name;
}

// Importes enteros con puntos de millar; los porcentajes llevan coma decimal y se descartan.
function integerAmounts(line) {
  return [...line.matchAll(/(?<![\d,.])-?\d{1,3}(?:\.\d{3})*(?![\d,.])/g)].map(match => Number(match[0].replaceAll('.', '')));
}

function findRow(lines, label, description) {
  const row = lines.find(line => fold(line).trimStart().startsWith(label));
  if (!row) throw new Error(`No se encontró la fila «${label}» en ${description}`);
  return row;
}

function sliceBetween(lines, startPredicate, endPredicate, description) {
  const start = lines.findIndex(startPredicate);
  if (start < 0) throw new Error(`No se encontró ${description}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(endPredicate);
  if (end < 0) throw new Error(`No se encontró el final de ${description}`);
  return rest.slice(0, end);
}

const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;

export function parseAeatMonthlyReport(text, { year, month }) {
  const monthLabel = fold(aeatMonthName(month));
  const lines = text.split(/\r?\n|\f/);
  const folded = lines.map(fold);

  const titles = new Set(folded.map(line => line.match(/INFORME MENSUAL DE RECAUDACION TRIBUTARIA\.\s+([A-Z]+)\s+(20\d{2})/)).filter(Boolean).map(match => `${match[1]} ${match[2]}`));
  if (!titles.size) throw new Error('El texto no parece un Informe mensual de recaudación tributaria de la AEAT');
  if (titles.size !== 1 || !titles.has(`${monthLabel} ${year}`)) throw new Error(`El informe corresponde a ${[...titles].join(', ')}, no a ${monthLabel} ${year}`);

  // Cuadro 1.1 · millones de euros · mes.
  const summaryStart = folded.findIndex((line, index) => /^\s*CUADRO 1\.1\s*$/.test(line) && folded.slice(index, index + 6).some(next => next.includes('EN MILLONES DE EUROS')));
  if (summaryStart < 0) throw new Error('No se encontró el Cuadro 1.1 en millones de euros');
  const monthBlock = sliceBetween(
    lines.slice(summaryStart),
    line => fold(line).trim() === `MES DE ${monthLabel}`,
    line => fold(line).includes('DESDE ENERO'),
    `el bloque «MES DE ${monthLabel}» del Cuadro 1.1`,
  );
  const description = 'el Cuadro 1.1';
  const yearColumns = (label, { territorial }) => {
    const amounts = integerAmounts(findRow(monthBlock, label, description));
    // Con columna de administraciones territoriales: Estado, AA.TT., Total (2026) y lo mismo para 2025.
    // Sin ella (capítulo III): Estado y Total de cada año.
    const expected = territorial ? 6 : 4;
    if (amounts.length !== expected) throw new Error(`La fila «${label}» del Cuadro 1.1 tiene ${amounts.length} importes y se esperaban ${expected}`);
    return territorial
      ? { state: amounts[0], territorial: amounts[1], total: amounts[2], previousTotal: amounts[5] }
      : { state: amounts[0], territorial: 0, total: amounts[1], previousTotal: amounts[3] };
  };
  const total = yearColumns('TOTAL GENERAL', { territorial: true });
  const chapters = {
    direct: yearColumns('CAP. I - IMPUESTOS DIRECTOS', { territorial: true }),
    indirect: yearColumns('CAP. II - IMPUESTOS INDIRECTOS', { territorial: true }),
    feesAndOther: yearColumns('CAP. III - TASAS Y OTROS INGRESOS', { territorial: false }),
  };

  // Redondeo oficial a millones: se admite 1 M€ por suma de dos piezas y 2 M€ por suma de tres.
  if (!near(total.state + total.territorial, total.total, 1)) throw new Error(`Estado (${total.state}) + AA.TT. (${total.territorial}) no coincide con el total del mes (${total.total})`);
  const chapterSum = chapters.direct.total + chapters.indirect.total + chapters.feesAndOther.total;
  if (!near(chapterSum, total.total, 2)) throw new Error(`Los capítulos I, II y III suman ${chapterSum} M€ y el total publicado es ${total.total} M€`);

  // Cuadro 1.3 · miles de euros · mes (comprobación independiente).
  const detail = sliceBetween(
    lines,
    line => /CUADRO 1\.3\..*DETALLE\.\s*MES\./.test(fold(line)),
    line => /CUADRO 1\.4\./.test(fold(line)),
    'el Cuadro 1.3 (detalle del mes)',
  );
  if (!detail.some(line => fold(line).includes('EN MILES DE EUROS'))) throw new Error('El Cuadro 1.3 ya no indica «En miles de euros»');
  const detailAmounts = integerAmounts(findRow(detail, 'TOTAL INGRESOS TRIBUTARIOS', 'el Cuadro 1.3'));
  if (detailAmounts.length !== 8) throw new Error(`La fila total del Cuadro 1.3 tiene ${detailAmounts.length} importes y se esperaban 8`);
  const [detailState, detailRegions, detailLocal, detailTotalThousands] = detailAmounts;
  if (!near(detailState + detailRegions + detailLocal, detailTotalThousands, 2)) throw new Error('Estado + CC.AA. + CC.LL. no coincide con el total del Cuadro 1.3');
  if (!near(Math.round(detailTotalThousands / 1000), total.total, 1)) throw new Error(`El Cuadro 1.1 (${total.total} M€) y el Cuadro 1.3 (${detailTotalThousands} miles €) no coinciden`);

  if (Math.abs(total.total) > 100_000) throw new Error(`Recaudación mensual fuera de rango: ${total.total} M€`);

  return {
    amountMillions: total.total,
    amountThousands: detailTotalThousands,
    stateMillions: total.state,
    territorialMillions: total.territorial,
    previousYearMillions: total.previousTotal,
    chapters: Object.fromEntries(Object.entries(chapters).map(([key, value]) => [key, value.total])),
  };
}
