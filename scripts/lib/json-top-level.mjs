// Sustituye solo el valor de una clave de primer nivel y deja intacto el resto
// del fichero (formato incluido), para que el diff muestre únicamente el dato mensual.
export function replaceTopLevelValue(text, key, value) {
  const marker = `\n  ${JSON.stringify(key)}: `;
  const start = text.indexOf(marker);
  if (start < 0 || text.indexOf(marker, start + 1) >= 0) throw new Error(`No se encontró una única clave «${key}» de primer nivel`);
  const valueStart = start + marker.length;
  let depth = 0, inString = false, end = -1;
  for (let i = valueStart; i < text.length; i++) {
    const char = text[i];
    if (inString) { if (char === '\\') i++; else if (char === '"') inString = false; continue; }
    if (char === '"') inString = true;
    else if (char === '{' || char === '[') depth++;
    else if (char === '}' || char === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end < 0) throw new Error(`No se pudo delimitar el valor de «${key}»`);
  const serialized = JSON.stringify(value, null, 2).replaceAll('\n', '\n  ');
  const result = `${text.slice(0, valueStart)}${serialized}${text.slice(end)}`;
  const expected = { ...JSON.parse(text), [key]: value };
  if (JSON.stringify(JSON.parse(result)) !== JSON.stringify(expected)) throw new Error(`La sustitución de «${key}» alteró otros datos`);
  return result;
}
