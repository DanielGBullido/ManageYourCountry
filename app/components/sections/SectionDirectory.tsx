'use client';

const sections = [
  { id: 'personas', number: '01', title: 'Personas y empleo', summary: 'Habitantes, empleo, paro y situaciones laborales.' },
  { id: 'comunidades', number: '02', title: 'Comunidades autónomas', summary: 'Impuestos registrados, ingresos, gasto y financiación.' },
  { id: 'ingresos', number: '03', title: 'Impuestos y servicios', summary: 'Recaudación tributaria y gasto por función pública.' },
  { id: 'prestaciones', number: '04', title: 'Pensiones, IMV y paro', summary: 'Ayudas explicadas con su importe y periodo.' },
  { id: 'metodologia', number: '05', title: 'Cómo leer las cifras', summary: 'Qué incluye cada dato y cómo compararlo.' },
  { id: 'fuente', number: '06', title: 'Fuentes oficiales', summary: 'Consulta los organismos y publicaciones.' },
];

function showSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  let current: HTMLElement | null = target;
  while (current) {
    if (current instanceof HTMLDetailsElement) current.open = true;
    current = current.parentElement;
  }

  window.history.replaceState(null, '', `#${id}`);
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  window.requestAnimationFrame(() => target.scrollIntoView({ behavior, block: 'start' }));
}

export default function SectionDirectory() {
  return (
    <nav className="section-directory" aria-label="Explora todas las secciones">
      <div className="section-directory-heading">
        <div><span className="eyebrow muted">EXPLORA LOS DATOS</span><h2>Toda la información,<br/><em>ordenada por temas.</em></h2></div>
        <p>Elige un tema para abrir sus datos. Todos los bloques siguen disponibles sin llenar la pantalla inicial.</p>
      </div>
      <div className="section-directory-grid">
        {sections.map(section => (
          <a href={`#${section.id}`} key={section.id} onClick={event => { event.preventDefault(); showSection(section.id); }}>
            <span>{section.number}</span><b>{section.title}</b><small>{section.summary}</small><i aria-hidden="true">Abrir sección ↗</i>
          </a>
        ))}
      </div>
    </nav>
  );
}
