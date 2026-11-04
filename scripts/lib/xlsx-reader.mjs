import { inflateRawSync } from 'node:zlib';

// Lector mínimo de libros .xlsx (Office Open XML) sin dependencias externas.
// Solo lee valores de celda (números y textos); ignora formatos y fórmulas, y
// devuelve el valor calculado que el propio fichero guarda en caché.

function readZipEntries(buffer) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) {
    if (buffer.readUInt32LE(i) === eocdSignature) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('El fichero no es un libro .xlsx válido (falta el directorio ZIP)');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Directorio ZIP dañado');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return name => {
    const entry = entries.get(name);
    if (!entry) return null;
    const local = entry.localOffset;
    if (buffer.readUInt32LE(local) !== 0x04034b50) throw new Error(`Entrada ZIP dañada: ${name}`);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return data.toString('utf8');
    if (entry.method === 8) return inflateRawSync(data).toString('utf8');
    throw new Error(`Compresión ZIP no admitida (${entry.method}) en ${name}`);
  };
}

const decodeXml = text => text
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&amp;/g, '&');

const textOf = xml => decodeXml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(match => match[1]).join(''));
const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function columnIndex(reference) {
  const letters = reference.match(/^[A-Z]+/)[0];
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

/**
 * Abre un libro .xlsx y devuelve sus hojas en orden.
 * @param {Buffer} buffer
 * @returns {{ sheetNames: string[], sheet(name: string): (string|number|null)[][] }}
 */
export function readXlsx(buffer) {
  if (buffer.subarray(0, 2).toString('latin1') !== 'PK') throw new Error('El fichero descargado no es un libro Excel .xlsx');
  const read = readZipEntries(buffer);
  const workbook = read('xl/workbook.xml');
  const rels = read('xl/_rels/workbook.xml.rels');
  if (!workbook || !rels) throw new Error('Falta xl/workbook.xml en el libro');
  const targets = new Map([...rels.matchAll(/<Relationship\s[^>]*>/g)].map(([tag]) => [attribute(tag, 'Id'), attribute(tag, 'Target')]));
  const sheets = [...workbook.matchAll(/<sheet\s[^>]*>/g)].map(([tag]) => {
    const target = targets.get(attribute(tag, 'r:id'));
    return { name: decodeXml(attribute(tag, 'name')), path: target.startsWith('/') ? target.slice(1) : `xl/${target}` };
  });
  const sharedXml = read('xl/sharedStrings.xml') ?? '';
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => textOf(match[1]));
  const cache = new Map();

  function sheet(name) {
    if (cache.has(name)) return cache.get(name);
    const info = sheets.find(item => item.name === name);
    if (!info) throw new Error(`El libro no contiene la hoja «${name}»`);
    const xml = read(info.path);
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row\s([^>]*)>([\s\S]*?)<\/row>/g)) {
      const rowIndex = Number(attribute(` ${rowMatch[1]}`, 'r')) - 1;
      const row = [];
      for (const cell of rowMatch[2].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = ` ${cell[1]}`;
        const body = cell[2] ?? '';
        const reference = attribute(attrs, 'r');
        const type = attribute(attrs, 't');
        let value = null;
        if (type === 'inlineStr') value = textOf(body);
        else {
          const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
          if (raw !== undefined) {
            if (type === 's') value = shared[Number(raw)];
            else if (type === 'str' || type === 'e') value = decodeXml(raw);
            else if (type === 'b') value = raw === '1';
            else value = Number(raw);
          }
        }
        if (value !== null && value !== '') row[columnIndex(reference)] = value;
      }
      rows[rowIndex] = Array.from(row, item => item ?? null);
    }
    const result = Array.from(rows, item => item ?? []);
    cache.set(name, result);
    return result;
  }

  return { sheetNames: sheets.map(item => item.name), sheet };
}
