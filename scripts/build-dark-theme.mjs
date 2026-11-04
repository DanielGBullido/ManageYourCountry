import postcss from 'postcss';
import { readFile, writeFile } from 'node:fs/promises';

// Genera app/dark.css a partir de los estilos claros: cada declaración con un
// color se repite dentro de `prefers-color-scheme: dark` con su equivalente
// oscuro. El equivalente invierte la luminosidad en OKLab y conserva el tono, así
// que los fondos claros pasan a superficies oscuras, el texto oscuro pasa a claro
// y los verdes siguen siendo verdes. Vuelve a ejecutarlo (`npm run styles:dark`)
// tras cambiar colores en base.css, components.css o spacing.css.

const files = ['base.css', 'components.css', 'spacing.css'];
const root = new URL('../app/', import.meta.url);

const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToOklab(hex) {
  const [r, g, b] = [1, 3, 5].map(i => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToHex([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return '#' + rgb.map(c => Math.round(Math.max(0, Math.min(1, toGamma(Math.max(0, c)))) * 255).toString(16).padStart(2, '0')).join('');
}

// Lightness map: paper (L≈0.96) → 0.20, white panels → 0.235, ink (L≈0.27) → 0.91.
// Mid tones (accents) move less, so green buttons and marks keep their weight.
function darkLightness(L) {
  if (L >= 0.9) return 0.235 - (L - 0.9) * 0.4 + (L >= 0.995 ? 0.0 : 0);
  return Math.min(0.94, Math.max(0.2, 1.15 - 0.95 * L));
}
function darkColor(hex) {
  const expanded = hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex.slice(0, 7);
  const alpha = hex.length === 9 ? hex.slice(7) : '';
  const [L, a, b] = hexToOklab(expanded.toLowerCase());
  const chromaScale = L >= 0.9 ? 0.7 : 1;
  return oklabToHex([darkLightness(L), a * chromaScale, b * chromaScale]) + alpha;
}

const colorPattern = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const out = postcss.root();
out.append(postcss.comment({ text: ' Generado por scripts/build-dark-theme.mjs. No lo edites a mano. ' }));
const media = postcss.atRule({ name: 'media', params: '(prefers-color-scheme:dark)' });
media.append(postcss.rule({ selector: ':root', nodes: [postcss.decl({ prop: 'color-scheme', value: 'dark' })] }));
let count = 0;
for (const file of files) {
  const css = postcss.parse(await readFile(new URL(file, root), 'utf8'));
  css.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const decls = rule.nodes.filter(node => node.type === 'decl' && colorPattern.test(node.value) && (colorPattern.lastIndex = 0, true));
    if (!decls.length) return;
    const copy = postcss.rule({ selector: rule.selector });
    for (const decl of decls) { copy.append(postcss.decl({ prop: decl.prop, value: decl.value.replace(colorPattern, darkColor), important: decl.important })); count += 1; }
    let target = media;
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'media') {
      target = media.nodes.find(node => node.type === 'atrule' && node.params === rule.parent.params) ?? media.append(postcss.atRule({ name: 'media', params: rule.parent.params })).last;
    }
    target.append(copy);
  });
}
out.append(media);
const generated = out.toString() + '\n';
if (process.argv.includes('--check')) {
  const current = await readFile(new URL('dark.css', root), 'utf8').catch(() => '');
  if (current !== generated) { console.error('app/dark.css no está al día: ejecuta npm run styles:dark'); process.exit(1); }
  console.log('app/dark.css está al día.');
} else {
  await writeFile(new URL('dark.css', root), generated);
  console.log(`Tema oscuro: ${count} declaraciones de color generadas en app/dark.css`);
}
