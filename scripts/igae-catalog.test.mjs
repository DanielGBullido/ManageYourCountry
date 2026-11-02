import test from 'node:test';
import assert from 'node:assert/strict';
import { findLatestReport } from './lib/igae-catalog.mjs';

test('chooses the newest monthly IGAE PDF from the official catalog', () => {
  const html = `
    <a href="../Documents/AAPP-M/IM_2025_12.pdf">Diciembre 2025</a>
    <a href="/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP-M/IM_2026_08.pdf">Agosto 2026</a>
    <a href="/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP-M/IM_2026_07.pdf">Julio 2026</a>`;
  const latest = findLatestReport(html);
  assert.equal(latest.year, 2026);
  assert.equal(latest.month, 8);
  assert.match(latest.url, /IM_2026_08\.pdf$/);
});

test('does not accept a catalog page without IGAE monthly report links', () => {
  assert.throws(() => findLatestReport('<a href="budget.xlsx">Data</a>'), /No se encontró/);
});
