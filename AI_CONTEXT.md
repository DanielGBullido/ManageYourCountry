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
- CSS propio en `app/base.css` y `app/overrides.css`; sin librería visual añadida.
- La página se compone desde `app/page.tsx`. Las secciones están en `app/components/sections/` y el simulador está dividido en piezas pequeñas dentro de `app/components/sections/budget/`.
- `app/lib/dashboard-data.ts` carga y tipa los datos locales.
- `app/components/DashboardExperience.tsx` controla el mes común y pasa una fotografía íntegra del panel a las secciones; `?mes=AAAA-MM` enlaza un mes disponible.
- `data/dashboard-periods.json` conserva snapshots completos. `npm run data:snapshot` solo añade un periodo si IGAE, AEAT mensual, prestaciones y datos autonómicos coinciden. El selector no inventa meses.
- `DESIGN_GUIDE.md` define identidad, voz, accesibilidad y criterios de diseño móvil.
- `app/lib/budget-scenario.ts` contiene las funciones puras de límites, asignación, dinero sin repartir, barras y codificación/lectura de escenarios compartidos.
- `app/components/layout/SiteHeader.tsx` contiene la navegación fija y móvil.
- `app/components/RegionalMap.tsx` dibuja las comunidades, permite selección con teclado y ofrece la tabla como alternativa.
- Mantener componentes con una responsabilidad clara; no mezclar adquisición de datos, reglas de negocio y presentación en una sola sección.

## Datos principales

Los datos que muestra la app están guardados en `data/`; la interfaz no consulta en directo todas las series.

- `data/igae-latest.json`: agregado mensual de ingresos y gastos de la IGAE que usa el simulador. Actualmente su referencia común es agosto de 2026. Excluye la Administración local y usa contabilidad nacional SEC 2010.
- `data/provenance/igae-latest.json` y `data/history/igae/`: fuente, periodo, fecha/huella y snapshots del importador IGAE.
- `data/prestaciones-latest.json`: pensiones, IMV y desempleo. Debe conservar sus fechas y definiciones oficiales.
- `data/personas-trabajo-latest.json`, `data/perfiles-empleo-latest.json` y `data/demografia-nacionalidad-latest.json`: población, EPA y perfiles. La EPA no incluye menores de 16 años.
- `data/comunidades-autonomicas.json`: series autonómicas. Distingue mediciones mensuales IGAE de liquidaciones anuales del sistema de financiación; Navarra y País Vasco tienen régimen foral y cobertura distinta.
- `data/recaudacion-tributaria-2025.json` y `data/gasto-funcional-2024.json`: contexto anual que no se suma al agregado mensual.

### Actualización de datos

`npm run data:refresh` descarga el catálogo mensual de IGAE, encuentra el PDF más reciente, extrae la tabla con `pdftotext` (Poppler), comprueba sumas y saldo, y conserva una versión con SHA-256. `npm run data:refresh:aeat` (`scripts/refresh-aeat.mjs`, lógica en `scripts/lib/aeat-catalog.mjs` y `scripts/lib/aeat-pdf-parser.mjs`) lee el catálogo de la AEAT, descarga el informe mensual más reciente y toma el cuadro 1.1, bloque «MES DE …», fila «TOTAL GENERAL», columna Total (millones de euros, recaudación neta en caja). Se detiene si el título no es del mes esperado, si Estado + AA.TT. o los capítulos I–III no suman el total, o si no coincide con el cuadro 1.3 (miles de euros). Archiva cada informe leído en `data/history/aeat/AAAA-MM-<sha>.json`, pero solo reescribe `latestMonthly` con el informe del mes de `data/igae-latest.json`; nunca adelanta la AEAT al panel. Procedencia en `data/provenance/aeat-latest.json`, que `validate:data` compara con `latestMonthly`. El workflow `.github/workflows/refresh-official-data.yml` está programado semanalmente y también se puede lanzar manualmente una vez que el proyecto esté publicado en GitHub Actions.

El importador IGAE se detiene sin cambiar los datos visibles si el mes del PDF no coincide con las series mensuales AEAT y prestaciones. Esto protege la decisión de producto de mostrar un mes comparable único. **IGAE y la recaudación mensual AEAT tienen importador automático**; prestaciones, población, EPA y datos autonómicos aún requieren actualización editorial. Antes de automatizar otra fuente, entender su calendario, formato, unidad, cobertura, revisiones y restricciones; agregar pruebas con una muestra real y conservar la URL original.

Tras una actualización IGAE aceptada, GitHub Actions ejecuta `npm run data:snapshot` y archiva el panel si las fuentes mensuales siguen alineadas. Vercel reconstruye al recibir el commit. Es una actualización programada al publicarse datos, no una consulta en vivo al entrar en la web. Hasta automatizar prestaciones y comunidades, un mes nuevo solo aparece cuando también se hayan actualizado esas fuentes y coincidan. Ojo: el importador IGAE exige que `latestMonthly` de la AEAT ya esté en el mes nuevo, y el importador AEAT solo escribe el mes que ya tiene la IGAE; para que el mes avance solo, el filtro IGAE tendrá que consultar el archivo `data/history/aeat/` del mes candidato.

## Comportamiento del simulador

- El tope total son los ingresos oficiales del mes.
- Al aumentar una partida sin saldo disponible, se reduce proporcionalmente el resto para hacerle sitio; nunca se puede gastar por encima del total de ingresos.
- Reducir una partida libera dinero sin repartirlo automáticamente.
- «Dejar todo sin repartir» lleva cada control a cero; «Volver al dato oficial» restaura el gasto registrado por la IGAE.
- La marca sobre cada barra identifica el gasto oficial observado. No es un mínimo ni una recomendación de eficiencia.
- Se puede editar el importe con teclado y compartir un escenario mediante el parámetro de URL `reparto`; los identificadores de partidas deben mantenerse estables.
- El saldo del escenario es ingresos menos gasto asignado. No se suma otra vez al saldo oficial y no representa dinero en una cuenta bancaria real.

## Comandos de desarrollo y validación

```bash
npm install
npm run dev
npm test
npm run validate:data
npm run build
```

`npm run data:refresh` requiere Internet y Poppler (`pdftotext`). Las pruebas actuales incluyen reglas del simulador, escenarios compartidos, catálogo/parser IGAE y coherencia de periodos. Tras cambios en una cifra, etiqueta o periodo, ejecutar `npm test`, `npm run validate:data` y `npm run build`.

## Despliegue

El proyecto se prepara para importar desde `DanielGBullido/ManageYourCountry` en Vercel como aplicación Next.js. No requiere variables de entorno para la versión actual. Configuración normal: directorio raíz `/`, instalación `npm install` (o detección automática), build `npm run build`, salida gestionada por Next.js. No subir `.env*`, `.vercel`, credenciales ni artefactos de `node_modules`/`.next`. El workflow de GitHub necesita permiso de escritura de contenidos para guardar actualizaciones de datos.

## Próximos trabajos conocidos

1. Automatizar, una a una, prestaciones y otras series compatibles (AEAT ya está hecha), siempre con un mecanismo de alineación del mes común y tests de regresión.
2. Añadir pruebas de navegador automatizadas para teclado, sliders, presupuestos, compartir enlaces y tamaños de pantalla móvil.
3. Revisar visualmente móviles reales, el mapa, los estados de carga/error y el uso con lectores de pantalla.
4. Incorporar más datos de ejecución presupuestaria, contratos y subvenciones solo cuando puedan vincularse con el mismo organismo, periodo, fase contable y concepto. Mantener visible la diferencia entre crédito aprobado, obligación reconocida, adjudicación y pago.
5. Revisar cada cifra nueva contra el documento oficial original y actualizar `DATA_SOURCES.md` y la metodología visible.
