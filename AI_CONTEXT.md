# Contexto del proyecto para futuras IA

## Propósito

**España en tus manos** es una web cívica para ayudar a cualquier persona en España a entender, con datos oficiales y lenguaje cotidiano, de dónde salen los ingresos públicos, en qué se gastan y qué cambiaría si se distribuyera el dinero de otra forma. El simulador es educativo: no mueve fondos públicos ni estima por sí mismo si una partida es suficiente o está sobregastada.

La persona usuaria prefiere español de España, explicaciones concretas y vocabulario reconocible. Hay que explicar siglas y conceptos (por ejemplo, pensión contributiva/no contributiva, IMV, población activa) la primera vez que aparezcan. Evitar rótulos vagos como «otros» o «resto» cuando los datos permitan el desglose. Si la fuente no publica el detalle, decirlo claramente y explicar qué contiene la categoría residual, sin inventar componentes.

## Principios editoriales y estadísticos

- Usar fuentes oficiales enlazadas junto a las cifras. Mostrar periodo, ámbito, unidad y método.
- Mantener un único mes común para el simulador y los indicadores mensuales que se comparan. No combinar meses distintos como si fueran una misma fotografía. Las series anuales o trimestrales pueden aparecer como contexto si llevan su periodo visible y se explica que no se suman al mes.
- No presentar gasto observado como «mínimo necesario», coste eficiente o prueba de sobrecoste. El importe oficial es una referencia contable; para evaluar eficiencia hace falta comparar resultados, costes, nivel de servicio y ejecución con el mismo ámbito y periodo.
- No atribuir un impuesto concreto a una prestación concreta: los ingresos se agrupan y se financian en un fondo público común.
- Distinguir impuestos recaudados, ingresos de una administración, transferencias entre administraciones y financiación autonómica. No son la misma medida y una transferencia pública puede duplicarse si se suman niveles sin consolidar.
- Aclarar que contratos adjudicados y subvenciones concedidas no demuestran por sí solos pagos de ese mes, ejecución final ni sobrecostes.
- Redondear para facilitar lectura, pero conservar precisión suficiente para que ingresos, gastos, saldo y dinero sin repartir cuadren.
- Accesibilidad: etiquetas comprensibles para lector de pantalla, controles utilizables por teclado, foco visible, estados claros y controles móviles amplios.

## Stack y organización

- Next.js 16, App Router; React 19; TypeScript.
- CSS propio, sin librería visual. Orden de carga: `app/base.css` (variables y base), `app/components.css` (componentes y responsive) y `app/spacing.css` (escala de espacios, se aplica al final). Antes de añadir una regla, busca si ya existe una para ese selector y edítala en vez de sobrescribirla más abajo.
- La página se compone desde `app/page.tsx`. Las secciones están en `app/components/sections/` y el simulador está dividido en piezas pequeñas dentro de `app/components/sections/budget/`.
- `app/lib/dashboard-data.ts` carga y tipa los datos locales.
- `app/components/DashboardExperience.tsx` controla el mes común y la vista del simulador, y pasa una fotografía íntegra del panel a las secciones. `?mes=AAAA-MM` enlaza un mes disponible y `?vista=acumulado` abre el acumulado del año.
- `app/lib/functional-scenario.ts` construye la vista «por función»: las diez funciones COFOG de `data/gasto-funcional-2024.json` como partidas y los ingresos del mismo año de `data/cuentas-anuales-aapp.json` (Eurostat, sector S13, con ayuntamientos) como tope. Es otro alcance y otro periodo que la IGAE mensual: nunca se suman ni se comparan como si fueran lo mismo. El gasto por funciones va un paso por detrás de la revisión del total (`revisionGap`, 121 M€ en 2024); se explica en el aviso de la vista. El equivalente por residente usa la población más reciente del INE, no la de ese año: es orientativo.
- `app/lib/year-to-date.ts` suma los flujos mensuales IGAE de enero al mes elegido. Devuelve `null` para enero o si falta algún mes; nunca mezcla un año incompleto.
- `data/dashboard-periods.json` conserva snapshots completos. `npm run data:snapshot` solo añade un periodo si IGAE, AEAT mensual, prestaciones y datos autonómicos coinciden. El selector no inventa meses.
- `DESIGN_GUIDE.md` define identidad, voz, accesibilidad y criterios de diseño móvil.
- `app/lib/budget-scenario.ts` contiene las funciones puras de límites, asignación, dinero sin repartir, barras y codificación/lectura de escenarios compartidos.
- `app/components/layout/SiteHeader.tsx` contiene la navegación fija y móvil.
- `app/components/RegionalMap.tsx` dibuja las comunidades, permite selección con teclado y ofrece la tabla como alternativa.
- Mantener componentes con una responsabilidad clara; no mezclar adquisición de datos, reglas de negocio y presentación en una sola sección.

## Datos principales

Los datos que muestra la app están guardados en `data/`; la interfaz no consulta en directo todas las series.

- `data/igae-latest.json`: agregado mensual de ingresos y gastos de la IGAE que usa el simulador. Actualmente su referencia común es agosto de 2026. Excluye la Administración local y usa contabilidad nacional SEC 2010.
- `data/provenance/igae-latest.json`: fuente, fecha y huella SHA-256 del último PDF importado. `data/history/igae/` guarda una copia de cada PDF nuevo; la carpeta se crea en la primera importación y puede no existir todavía.
- `data/prestaciones-latest.json`: pensiones contributivas, PNC, IMV y desempleo. Debe conservar sus fechas y definiciones oficiales. Lo escriben los importadores automáticos (una ficha cada uno); no editar a mano sin actualizar también la procedencia y el archivo.
- `data/personas-trabajo-latest.json`, `data/perfiles-empleo-latest.json` y `data/demografia-nacionalidad-latest.json`: población, EPA y perfiles. La EPA no incluye menores de 16 años.
- `data/comunidades-autonomicas.json`: series autonómicas. Distingue mediciones mensuales IGAE de liquidaciones anuales del sistema de financiación; Navarra y País Vasco tienen régimen foral y cobertura distinta. Las columnas mensuales se llaman `igaeMonthlyTax`, `igaeMonthlyRevenue`, `igaeMonthlyExpenditure` e `igaeMonthlyBalance` (antes `igaeAugust*`) y las escribe `npm run data:refresh:ccaa`; capacidad fiscal y financiación (liquidación anual de Hacienda) siguen siendo editoriales.
- `data/recaudacion-tributaria-2025.json` y `data/gasto-funcional-2024.json`: contexto anual que no se suma al agregado mensual.

### Actualización de datos

`npm run data:refresh` descarga el catálogo mensual de IGAE, encuentra el PDF más reciente, extrae la tabla con `pdftotext` (Poppler), comprueba sumas y saldo, y conserva una versión con SHA-256. `npm run data:refresh:aeat` (`scripts/refresh-aeat.mjs`, lógica en `scripts/lib/aeat-catalog.mjs` y `scripts/lib/aeat-pdf-parser.mjs`) lee el catálogo de la AEAT, descarga el informe mensual más reciente y toma el cuadro 1.1, bloque «MES DE …», fila «TOTAL GENERAL», columna Total (millones de euros, recaudación neta en caja). Se detiene si el título no es del mes esperado, si Estado + AA.TT. o los capítulos I–III no suman el total, o si no coincide con el cuadro 1.3 (miles de euros). Archiva cada informe leído en `data/history/aeat/AAAA-MM-<sha>.json`, pero solo reescribe `latestMonthly` con el informe del mes de `data/igae-latest.json`; nunca adelanta la AEAT al panel. Procedencia en `data/provenance/aeat-latest.json`, que `validate:data` compara con `latestMonthly`. El workflow `.github/workflows/refresh-official-data.yml` está programado semanalmente y también se puede lanzar manualmente una vez que el proyecto esté publicado en GitHub Actions.

Prestaciones y datos autonómicos tienen un importador por fuente, todos sobre `scripts/lib/official-import.mjs` (descarga, SHA-256, archivo y procedencia) y `scripts/lib/xlsx-reader.mjs` (lector de .xlsx sin dependencias):

- `scripts/refresh-pensiones.mjs` + `scripts/lib/seguridad-social-pensions.mjs`: libro «Series de pensiones en vigor» `S<AAAAMM>.xlsx`, hoja `S_Total`, una fila por nómina del año («1 agosto»…). Comprueba que las clases sumen el total y que la pensión media sea importe/número.
- `scripts/refresh-pnc.mjs` + `scripts/lib/imserso-pnc.mjs`: `evolpncs.xlsx` del Imserso (Anexo 1, total Estado con Navarra y País Vasco), importes brutos en euros. Jubilación + incapacidad = total; «JUNIO*»/«NOVIEMBRE*» llevan paga extra.
- `scripts/refresh-imv.mjs` + `scripts/lib/inss-imv.mjs`: la sección IMV de `revista.seg-social.es` enlaza cada mes `AAAAMM_IMV - Nómina.xlsx`. Comprueba título del mes y que las 19 filas territoriales sumen la fila TOTAL. La cuantía media no incluye atrasos y el importe sí: no deben coincidir.
- `scripts/refresh-paro.mjs` + `scripts/lib/prd-unemployment.mjs`: Estadística PRD del Ministerio de Trabajo (datos SEPE), tablas PRD-E1 (beneficiarios, cobertura) y PRD-E2 (gasto en miles de euros con cotizaciones). El libro del mes M trae gasto solo hasta M−1; un mes solo es completo con las dos tablas. `www.mites.gob.es` no envía su certificado intermedio: `fetchOfficial` añade el de FNMT guardado en `scripts/certs/` solo para ese dominio.
- `scripts/refresh-igae-ccaa.mjs` + `scripts/lib/igae-ccaa.mjs`: `M_CCAA_Sub_Det_AAAA.xlsx`, Tabla2a–Tabla18a, acumulados; flujo = acumulado del mes − acumulado anterior. Comprueba ingresos − gastos = B.9 por comunidad y la suma de comunidades frente a Tabla1a (impuestos exactos; ingresos y gastos con margen de consolidación).

Todos archivan en `data/history/<fuente>/AAAA-MM-<sha12>.json` cada mes completo igual o posterior al de la IGAE (sin duplicar si las cifras no cambian), escriben solo el mes de `data/igae-latest.json` (desde la publicación vigente o, si ya no lo incluye, desde la copia archivada) y guardan `data/provenance/<fuente>-latest.json`. `validate:data` comprueba que esa procedencia sea del mes y del fichero mostrados y que exista una copia archivada con las mismas cifras.

El importador IGAE solo avanza a un mes nuevo si cada serie auxiliar (AEAT, las cuatro prestaciones y comunidades) ya muestra ese mes o lo tiene archivado; si falta alguna, se detiene sin cambiar los datos visibles. Esto protege la decisión de producto de mostrar un mes comparable único. Población, EPA, perfiles y datos anuales aún requieren actualización editorial. Antes de automatizar otra fuente, entender su calendario, formato, unidad, cobertura, revisiones y restricciones; agregar pruebas con una muestra real y conservar la URL original.

Tras una actualización IGAE aceptada, GitHub Actions ejecuta `npm run data:snapshot` y archiva el panel si las fuentes mensuales siguen alineadas. Vercel reconstruye al recibir el commit. Es una actualización programada al publicarse datos, no una consulta en vivo al entrar en la web. El workflow hace dos pasadas: primero lanza los importadores auxiliares (con `continue-on-error`, para que una web caída no bloquee las demás) y así archivan los meses nuevos; luego la IGAE; si la IGAE ha cambiado de mes, `npm run data:refresh:auxiliares` escribe ese mes en todas las series. En la práctica el último dato en llegar suele ser el gasto en paro (PRD), que se publica a finales del mes siguiente al de los beneficiarios.

## Comportamiento del simulador

- El periodo es el mes elegido o, en la vista acumulada, de enero a ese mes. La vista acumulada solo afecta al recorrido del dinero y al simulador; la cabecera y la comparación AEAT siguen siendo del mes.
- Modo por defecto: el tope total son los ingresos oficiales del periodo. Al subir una partida sin saldo disponible, el resto baja en proporción para hacerle sitio.
- Modo «Permitir déficit»: cada partida puede llegar como mucho al total de ingresos, el gasto total puede superarlos y se muestra la necesidad de financiación («habría que pedir prestado»). Al desactivarlo, todas las partidas se reducen en proporción hasta caber en los ingresos.
- «Volver al dato oficial» activa el modo déficit si el gasto oficial superó los ingresos (por ejemplo, en enero de 2026), para no recortar la cifra real.
- Reducir una partida libera dinero sin repartirlo automáticamente.
- El escenario empieza con el gasto oficial (si superó los ingresos, con «Permitir déficit» activado). «Empezar de cero» lleva cada partida a cero; «Volver al dato oficial» restaura el gasto registrado por la IGAE.
- Cada partida tiene su propia escala: la barra llega a tres veces su gasto oficial (sin pasar de los ingresos) y los botones − y + mueven un 5 % del oficial. La diferencia se muestra también en euros por residente (población del INE); es una escala orientativa, no lo que paga o recibe cada persona.
- La barra de resumen (`ScenarioDock`) queda fija al pie de la pantalla mientras se recorren las partidas. Necesita que ningún ancestro tenga `overflow: hidden`; por eso `main` usa `overflow-x: clip`.
- La marca sobre cada barra identifica el gasto oficial observado. No es un mínimo ni una recomendación de eficiencia.
- Se puede editar el importe con teclado y compartir un escenario mediante los parámetros de URL `reparto` y `deficit=1`; los identificadores de partidas deben mantenerse estables. Cambiar de mes o de vista borra ambos parámetros.
- El saldo del escenario es ingresos menos gasto asignado. No se suma otra vez al saldo oficial y no representa dinero en una cuenta bancaria real.

## Comandos de desarrollo y validación

```bash
npm install
npm run dev
npm test
npm run validate:data
npm run build
```

`npm run data:refresh` y `npm run data:refresh:aeat` requieren Internet y Poppler (`pdftotext`); los importadores de prestaciones y comunidades solo requieren Internet. Las pruebas de esos importadores usan los libros oficiales reales en `scripts/fixtures/` (sus SHA-256 coinciden con la procedencia registrada) y comprueban las cifras de agosto de 2026 que antes se copiaban a mano. Las pruebas actuales incluyen reglas del simulador, escenarios compartidos, catálogo/parser IGAE, catálogo/parser AEAT (con un extracto real del informe de agosto de 2026) y coherencia de periodos. Tras cambios en una cifra, etiqueta o periodo, ejecutar `npm test`, `npm run validate:data` y `npm run build`.

## Despliegue

El proyecto se prepara para importar desde `DanielGBullido/ManageYourCountry` en Vercel como aplicación Next.js. No requiere variables de entorno para la versión actual. Configuración normal: directorio raíz `/`, instalación `npm install` (o detección automática), build `npm run build`, salida gestionada por Next.js. No subir `.env*`, `.vercel`, credenciales ni artefactos de `node_modules`/`.next`. El workflow de GitHub necesita permiso de escritura de contenidos para guardar actualizaciones de datos.

## Próximos trabajos conocidos

1. Automatizar otras series compatibles (AEAT, prestaciones y comunidades ya están hechas), siempre con un mecanismo de alineación del mes común y tests de regresión. El parser del PDF IGAE (`scripts/lib/igae-pdf-parser.mjs`) lee los dos formatos de `pdftotext`: el antiguo, con las cifras tras la segunda línea de una etiqueta partida, y el de Poppler 26, que las coloca entre las dos líneas (`joinWrappedLabels`). Hay un test con la página real en `scripts/fixtures/igae/`. Si cambia el formato otra vez, el parser falla sin escribir datos.
2. Añadir pruebas de navegador automatizadas para teclado, sliders, presupuestos, compartir enlaces y tamaños de pantalla móvil.
3. Revisar visualmente móviles reales, el mapa, los estados de carga/error y el uso con lectores de pantalla.
4. Incorporar más datos de ejecución presupuestaria, contratos y subvenciones solo cuando puedan vincularse con el mismo organismo, periodo, fase contable y concepto. Mantener visible la diferencia entre crédito aprobado, obligación reconocida, adjudicación y pago.
5. Revisar cada cifra nueva contra el documento oficial original y actualizar `DATA_SOURCES.md` y la metodología visible.
