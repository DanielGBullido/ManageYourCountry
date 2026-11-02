const monthNumbers = new Map([
  ['enero', '01'], ['febrero', '02'], ['marzo', '03'], ['abril', '04'],
  ['mayo', '05'], ['junio', '06'], ['julio', '07'], ['agosto', '08'],
  ['septiembre', '09'], ['setiembre', '09'], ['octubre', '10'],
  ['noviembre', '11'], ['diciembre', '12'],
]);

export function toYearMonth(value) {
  if (typeof value !== 'string') return null;
  const numeric = value.match(/^(20\d{2})-(0[1-9]|1[0-2])$/);
  if (numeric) return `${numeric[1]}-${numeric[2]}`;
  const label = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').match(/([a-z]+)(?:\s+de)?\s+(20\d{2})/);
  if (!label) return null;
  const month = monthNumbers.get(label[1]);
  return month ? `${label[2]}-${month}` : null;
}

export function matchesCommonReferenceMonth(candidate, referencePeriods) {
  const candidateMonth = toYearMonth(candidate);
  const references = referencePeriods.map(toYearMonth);
  return Boolean(candidateMonth && references.length && references.every(period => period === candidateMonth));
}
