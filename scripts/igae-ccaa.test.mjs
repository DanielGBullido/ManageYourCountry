import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listCcaaWorkbooks, parseCcaaWorkbook } from './lib/igae-ccaa.mjs';
import { formatNumber, longLabel, monthNumber, previousPeriod, shortLabel } from './lib/official-import.mjs';

// Libro oficial M_CCAA_Sub_Det_2026.xlsx (actualización IGAE del 30/10/2026).
const workbook = readFileSync(new URL('./fixtures/igae-ccaa/M_CCAA_Sub_Det_2026.xlsx', import.meta.url));

// Valores de agosto de 2026 calculados a mano antes de automatizar la serie.
const manualAugust = {
  'Andalucía': [885, 2858, 3453, -595], 'Aragón': [214, 536, 569, -33], 'Asturias': [174, 483, 475, 8],
  'Illes Balears': [284, 598, 612, -14], 'Canarias': [401, 1041, 973, 68], 'Cantabria': [80, 281, 275, 6],
  'Castilla-La Mancha': [256, 801, 801, 0], 'Castilla y León': [343, 940, 1046, -106], 'Cataluña': [2418, 3819, 3394, 425],
  'Comunitat Valenciana': [953, 1987, 2285, -298], 'Extremadura': [191, 561, 451, 110], 'Galicia': [415, 1160, 1138, 22],
  'La Rioja': [44, 146, 154, -8], 'Comunidad de Madrid': [2047, 3336, 3035, 301], 'Región de Murcia': [121, 439, 619, -180],
  'Navarra': [940, 1024, 614, 410], 'País Vasco': [1, 1277, 1292, -15],
};

test('lists the yearly IGAE regional workbooks', () => {
  const html = '<a href="/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/CCAA-M/M_CCAA_Sub_Det_2025.xlsx"></a><a href="/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/CCAA-M/M_CCAA_Sub_Det_2026.xlsx">';
  assert.deepEqual(listCcaaWorkbooks(html).map(item => item.year), [2026, 2025]);
  assert.match(listCcaaWorkbooks(html)[0].url, /^https:\/\/www\.igae\.pap\.hacienda\.gob\.es\/.*M_CCAA_Sub_Det_2026\.xlsx$/);
});

test('turns cumulative figures into monthly flows for the 17 communities', () => {
  const months = parseCcaaWorkbook(workbook);
  assert.deepEqual(months.map(item => item.period), ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
  const august = months.at(-1).values;
  assert.equal(august.updatedOn, '2026-10-30');
  assert.equal(august.communities.length, 17);
  for (const community of august.communities) {
    assert.deepEqual([community.tax, community.revenue, community.expenditure, community.balance], manualAugust[community.name], community.name);
  }
  const january = months[0].values.communities.find(item => item.name === 'Andalucía');
  assert.deepEqual([january.tax, january.revenue, january.expenditure], [949, 2755, 2778], 'enero es el propio acumulado');
});

test('formats periods and Spanish numbers like the dashboard', () => {
  assert.equal(shortLabel('2026-08'), 'Agosto 2026');
  assert.equal(longLabel('2026-09'), 'Septiembre de 2026');
  assert.equal(previousPeriod('2027-01'), '2026-12');
  assert.equal(monthNumber('SEPTIEMBRE'), 9);
  assert.equal(monthNumber('Setiembre'), 9);
  assert.equal(formatNumber(1373.4421, 2), '1.373,44');
  assert.equal(formatNumber(10535869), '10.535.869');
});
