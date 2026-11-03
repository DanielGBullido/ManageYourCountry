# España en tus manos

Guía visual: [`DESIGN_GUIDE.md`](./DESIGN_GUIDE.md). Contexto para futuras IA: [`AI_CONTEXT.md`](./AI_CONTEXT.md).

Web app cívica para explorar datos públicos de ingresos y gastos y probar escenarios de reparto.

## Stack y ejecución

- Next.js 16 con App Router, React 19 y TypeScript.
- CSS propio, sin librería de gráficos: el gráfico circular usa `conic-gradient`.
- Requiere Node.js 20.9 o superior.

## Estructura de la interfaz

- `app/page.tsx` compone la página y carga datos locales tipados desde `app/lib/dashboard-data.ts`.
- `app/components/sections/` mantiene cada bloque de contenido por separado; un índice visible abre cada tema y los bloques informativos se renderizan en servidor. Solo el simulador, el mapa y el índice de navegación necesitan estado en el navegador.
- `app/lib/budget-scenario.ts` contiene los límites por partida, el dinero sin asignar y el cálculo del gráfico como funciones sin efectos secundarios.
- `app/lib/format.ts` centraliza los formatos de euros, millones, porcentajes y personas para el español de España.
- El mapa autonómico se descarga al abrir su sección. La navegación móvil y los desplegables usan controles HTML nativos para teclado y lector de pantalla, sin añadir una dependencia de componentes que duplique esos controles.
- Los estilos propios se organizan en `app/base.css` y `app/overrides.css`; el foco visible, el enlace para saltar al simulador y la preferencia de movimiento reducido están contemplados.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Datos integrados

La página prioriza la entrada por el simulador. Personas, mapa autonómico, prestaciones, metodología y fuentes aparecen como secciones desplegables con un resumen visible; los enlaces de navegación las abren directamente. La vista inicial usa cifras oficiales del informe de la IGAE de agosto de 2026, en millones de euros y con la columna **«En el mes»**. El alcance es Administración central + Administración regional + Fondos de Seguridad Social; excluye Administración local. Criterio: contabilidad nacional SEC 2010, Revisión Estadística 2024.

La fuente y el detalle metodológico están en la interfaz. Las cifras que usa la página se guardan localmente con su fuente y periodo. El histórico IGAE de enero a agosto de 2026 se conserva desde la hoja oficial acumulada; el selector cambia esas cuentas mensuales y el simulador. Las series de ayudas, empleo, población, AEAT y comunidades conservan el periodo real de su publicación, indicado en cada sección; no se recrean meses antiguos con datos que no existen. El mapa consulta al abrirse el servicio cartográfico del IGN. La recaudación mensual AEAT se actualiza con un importador automático; el resto de esas series aún requiere actualización editorial y no se consulta en directo desde la aplicación.

El selector superior ofrece los meses IGAE archivados localmente. `data/igae-monthly-history-2026.json` conserva la serie normalizada y `data/sources/igae/M_CONSOLIDADO_2026.xlsx` la copia de la fuente original; `data/dashboard-periods.json` alimenta la interfaz. `npm run data:snapshot` conserva la serie local al regenerar el panel. El selector cambia el resumen mensual y el simulador. Prestaciones, datos autonómicos y demás indicadores auxiliares mantienen su propio mes o año visible; sirven de contexto y no se presentan como si correspondieran todos al mes elegido.

La cabecera muestra también la deuda PDE del Banco de España para el mismo mes seleccionado, tomada de `data/public-debt-history-2026.json`. Es un saldo acumulado distinto del flujo mensual IGAE; además, su cobertura incluye corporaciones locales. Un superávit mejora la necesidad de financiación, pero no prueba que ese importe se destinara automáticamente a amortizar deuda.

El simulador usa como tope los ingresos públicos del mes: al redistribuir, puedes gastar menos y dejar la diferencia sin repartir, pero nunca asignar más dinero del que entró. Al volver al dato oficial, el gasto oficial de 55.019 M€ deja sin repartir los 1.316 M€ restantes de los 56.335 M€ ingresados. El saldo mostrado es ese remanente del escenario; no se suma dos veces al saldo oficial ni representa dinero en una cuenta real. Un índice visible ofrece acceso directo a personas y empleo, comunidades, impuestos y servicios, prestaciones, metodología y fuentes. Se muestra además un equivalente orientativo por residente y un esquema del recorrido agregado de ingresos a gasto; no representa pagos, impuestos ni prestaciones individuales. El bloque demográfico muestra las comprobaciones de suma: menores de 18 + personas de 18 o más = población total; nacionalidad española + extranjera = población total. También distingue lugar de nacimiento; la población española nacida fuera de España no es equivalente al número exacto de personas naturalizadas. El bloque laboral distingue con empleo, en paro que buscan empleo e inactivas. La EPA de 16+ cuadra como 22.852.600 con empleo + 2.591.200 en paro = 25.443.800 activas; las activas + 17.308.000 inactivas = 42.751.800 personas de 16 o más. El total residente de todas las edades es otra medición y fecha: la diferencia se debe principalmente a menores de 16, pero no es un recuento exacto al cruzar fuentes. Autónomos y empleo público se documentan con estadísticas y coberturas propias. [`data/prestaciones-latest.json`](data/prestaciones-latest.json) amplía pensiones, IMV y paro.

El panel autonómico separa impuestos, ingresos, gastos y saldo mensual de cada Administración regional en agosto de 2026, de capacidad fiscal normativa y financiación del sistema común en 2024. Incluye un mapa interactivo coloreado por la cifra seleccionada; los límites proceden del servicio cartográfico del IGN y, si no hay conexión, queda disponible la tabla. El dato mensual se calcula restando acumulados y no representa todos los impuestos pagados en el territorio; Navarra y País Vasco tienen régimen foral y una cobertura contable distinta. Los datos están en [`data/comunidades-autonomicas.json`](data/comunidades-autonomicas.json). También hay paneles de población por nacionalidad ([`data/demografia-nacionalidad-latest.json`](data/demografia-nacionalidad-latest.json)), recaudación anual por impuestos ([`data/recaudacion-tributaria-2025.json`](data/recaudacion-tributaria-2025.json)) y gasto anual por funciones COFOG ([`data/gasto-funcional-2024.json`](data/gasto-funcional-2024.json)). Sus fechas y métodos son distintos del agregado IGAE mensual, por lo que no se suman a agosto.

El detalle del gasto enlaza a los portales oficiales de contratos públicos, subvenciones, ejecución presupuestaria y fiscalización. Son registros y documentos para investigar expedientes concretos, no cifras que se importen o sumen al simulador. Sus coberturas, periodos y criterios contables varían; un contrato adjudicado tampoco demuestra por sí solo el importe finalmente pagado ni que exista sobrecoste.

Inventario de otras fuentes y plan para actualizar series: [DATA_SOURCES.md](DATA_SOURCES.md).

## Actualización de datos

La serie mensual de la IGAE se descarga del catálogo oficial como PDF. [`scripts/refresh-igae.mjs`](scripts/refresh-igae.mjs) localiza el informe más reciente, extrae la tabla de la página 7 con Poppler, valida sumas y saldo, comprueba que el mes coincide con AEAT y prestaciones, y conserva fuente, fecha de descarga, SHA-256 y copia histórica.

La recaudación mensual de la AEAT también se importa sola. [`scripts/refresh-aeat.mjs`](scripts/refresh-aeat.mjs) lee el [catálogo del Informe mensual de recaudación tributaria](https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Informe_mensual_de_Recaudacion_Tributaria.shtml), descarga el PDF más reciente y extrae los ingresos tributarios netos del mes (cuadro 1.1, «TOTAL GENERAL»). Antes de aceptar la cifra, comprueba que el título del informe corresponde al mes, que Estado + administraciones territoriales y los capítulos I a III suman el total, y que coincide con el cuadro 1.3 en miles de euros. Solo actualiza `latestMonthly` en [`data/recaudacion-tributaria-2025.json`](data/recaudacion-tributaria-2025.json), y siempre con el informe del mismo mes que la IGAE; si la AEAT ya ha publicado meses posteriores, se archivan en `data/history/aeat/` con su SHA-256 hasta que el resto de fuentes llegue a ese mes. La procedencia del dato mostrado está en `data/provenance/aeat-latest.json`.

El workflow semanal está en [`.github/workflows/refresh-official-data.yml`](.github/workflows/refresh-official-data.yml). Las prestaciones, los datos autonómicos y el resto de indicadores todavía no tienen importadores automáticos.

Comandos: `npm test`, `npm run validate:data`, `npm run data:refresh` y `npm run data:refresh:aeat` (requieren conexión a internet y `pdftotext` de Poppler) y `npm run build`.
