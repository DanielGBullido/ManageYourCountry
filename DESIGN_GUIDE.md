# Guía de diseño · España en tus manos

## Personalidad

Una herramienta cívica cercana, clara y serena. Debe sentirse rigurosa sin parecer una hoja de cálculo ni una web institucional difícil de leer. Explica el presupuesto con palabras habituales en España y separa siempre hechos oficiales de simulaciones.

## Identidad visual

- **Marca:** el símbolo representa un libro de cuentas abierto en líneas sencillas y un punto de decisión en color terracota. No usa banderas ni símbolos partidistas.
- **Logotipo completo:** `public/logo.svg`.
- **Símbolo para cabecera y tamaños pequeños:** `public/brand-mark.svg`.
- **Iconos:** `public/icon.svg` y `public/apple-icon.svg`; el icono de Next se define en `app/layout.tsx`.
- **Verde tinta:** `#244332`, para títulos, navegación y elementos principales.
- **Verde hoja:** `#718b70`, para acciones positivas y datos oficiales.
- **Terracota:** `#e19a5b`, para avisos, referencias y puntos de atención; no comunica por sí sola una valoración política.
- **Fondo cálido:** `#f7f7f1`; tarjetas blancas y divisores verde grisáceo.
- **Tipografía:** Manrope para títulos y cifras principales; DM Sans para lectura; DM Mono solo para fechas, etiquetas y cifras tabulares.

## Composición y móvil

- Presentar primero la pregunta o conclusión, luego la cifra principal y después su explicación y fuente.
- Mantener una columna principal legible. En móvil, una idea por tarjeta, cifras sin recortes y controles con área táctil mínima de 44 px.
- El simulador debe mostrar juntos presupuesto, asignado y sin repartir. La comparación con la cifra oficial debe estar pegada a su control.
- Las secciones secundarias pueden plegarse para reducir el desplazamiento inicial, pero todas deben seguir accesibles desde el índice y la navegación.
- Las notas metodológicas largas van en listas o desplegables; no convertir cada tarjeta en un párrafo.
- El selector superior cambia solamente entre meses con un panel completo y comparable. Años y trimestres se muestran como contexto con su periodo propio.

## Voz y datos

- Español de España, frases directas y explicación de siglas al primer uso.
- No usar «otros», «resto» o «varios» sin enumerar los conceptos que la fuente incluye; si la fuente no da el detalle, decirlo y enlazar el documento original.
- Una cifra lleva periodo, unidad, administración o ámbito y fuente.
- «Caritas» en el simulador describen solo una comparación: más, igual o menos euros que la referencia oficial. No significan satisfacción, calidad, eficiencia ni quién recibe el dinero.
- El gasto oficial observado no es el mínimo necesario ni prueba de sobrecoste.
- No sumar estadísticas anuales, trimestrales y mensuales en un único total.

## Accesibilidad

- Contraste suficiente, foco de teclado visible y nombres accesibles en controles.
- No depender solo del color o de una cara para comunicar estados: acompañarlos siempre con texto.
- Respetar `prefers-reduced-motion`; los controles deben poder manejarse sin ratón.
- Evitar texto esencial dentro de imágenes. Los SVG de marca son decorativos cuando el nombre de marca aparece junto al símbolo.

## Revisión antes de publicar

1. Verificar anchuras de 360 px, 390 px, tablet y escritorio.
2. Comprobar que el mes seleccionado se refleja en resumen, simulador, prestaciones e indicadores territoriales.
3. Confirmar que todos los meses del selector tienen fuentes alineadas y documentación de procedencia.
4. Revisar que cifras, periodos y enlaces siguen siendo correctos tras actualizar los datos oficiales.
