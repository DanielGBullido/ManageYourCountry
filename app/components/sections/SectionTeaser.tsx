'use client';

import type { ReactNode } from 'react';

type Figure = { label: string; value: string; note?: string };

type SectionTeaserProps = {
  number: string;
  title: string;
  lead: string;
  figures?: Figure[];
  children?: ReactNode;
  /** id of the <details> with the full section, opened by the button. */
  targetId: string;
  actionLabel: string;
};

function openSection(id: string) {
  const target = document.getElementById(id);
  if (!(target instanceof HTMLDetailsElement)) return;
  target.open = true;
  window.history.replaceState(null, '', `#${id}`);
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  window.requestAnimationFrame(() => target.scrollIntoView({ behavior, block: 'start' }));
}

// Always-visible summary of a long section: its key figures are seen while
// scrolling, without opening anything. The full detail stays one click away.
export default function SectionTeaser({ number, title, lead, figures = [], children, targetId, actionLabel }: SectionTeaserProps) {
  const headingId = `${targetId}-resumen`;
  return <section className="section-teaser" aria-labelledby={headingId}>
    <div className="section-teaser-head">
      <span className="section-teaser-number" aria-hidden="true">{number}</span>
      <div><h2 id={headingId}>{title}</h2><p>{lead}</p></div>
    </div>
    {figures.length > 0 && <div className="section-teaser-figures">{figures.map(figure => <div key={figure.label}><span>{figure.label}</span><b>{figure.value}</b>{figure.note && <small>{figure.note}</small>}</div>)}</div>}
    {children}
    <button type="button" className="section-teaser-action" onClick={() => openSection(targetId)} aria-controls={targetId}>{actionLabel} <span aria-hidden="true">↓</span></button>
  </section>;
}
