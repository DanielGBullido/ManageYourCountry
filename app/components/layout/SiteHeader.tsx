'use client';

function openDisclosure(id: string) {
  const panel = document.getElementById(id);
  if (panel instanceof HTMLDetailsElement) panel.open = true;
}

function followSection(id: string) {
  openDisclosure(id);
  const mobileMenu = document.getElementById('mobile-navigation') as HTMLDetailsElement | null;
  if (mobileMenu) mobileMenu.open = false;
}

function NavigationLinks() {
  return <>
    <a href="#presupuesto">Presupuesto</a>
    <a href="#personas" onClick={() => followSection('personas')}>Personas y trabajo</a>
    <a href="#comunidades" onClick={() => followSection('comunidades')}>Comunidades</a>
    <a href="#contexto" onClick={() => followSection('contexto')}>Contexto</a>
    <a href="#metodologia" onClick={() => followSection('metodologia')}>Metodología</a>
    <a href="#fuente" onClick={() => followSection('fuente')}>Fuentes</a>
  </>;
}

export default function SiteHeader() {
  return <>
    <a className="skip-link" href="#presupuesto">Saltar al simulador</a>
    <aside className="topline" aria-label="Presentación del proyecto"><span>UNA HERRAMIENTA CÍVICA PARA ENTENDER EL DINERO PÚBLICO</span><span className="top-date">DATOS OFICIALES · ESCENARIOS CIUDADANOS</span></aside>
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="España en tus manos, inicio"><img className="brand-mark-image" src="/brand-mark.svg" alt="" aria-hidden="true"/><span>ESPAÑA<br/><b>EN TUS MANOS</b></span></a>
      <nav className="desktop-navigation" aria-label="Navegación principal"><NavigationLinks/></nav>
      <details className="mobile-navigation" id="mobile-navigation"><summary aria-label="Abrir o cerrar menú de navegación">Menú <span aria-hidden="true">☰</span></summary><nav aria-label="Navegación móvil"><NavigationLinks/></nav></details>
      <a className="share-button" href="#presupuesto">Probar el simulador <span>↓</span></a>
    </header>
  </>;
}
