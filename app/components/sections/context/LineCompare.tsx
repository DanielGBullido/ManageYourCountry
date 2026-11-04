'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export type LineSeries = { id: string; label: string; color: string; values: (number | null)[] };

type LineCompareProps = {
  title: string;
  years: number[];
  series: LineSeries[];
  format: (value: number) => string;
  /** Axis tick format; defaults to `format`. */
  formatTick?: (value: number) => string;
  zeroLine?: boolean;
  ariaSummary: string;
};

const HEIGHT = 220;
const PAD = { top: 14, right: 56, bottom: 28, left: 40 };

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = start; value <= end + step / 2; value += step) ticks.push(Math.round(value * 100) / 100);
  return ticks;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// Two-series line chart (one emphasised, one context) with a crosshair tooltip
// that also works with the keyboard, end labels and a table view.
export default function LineCompare({ title, years, series, format, formatTick = format, zeroLine = false, ariaSummary }: LineCompareProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const values = series.flatMap(item => item.values.filter((value): value is number => value !== null));
  const ticks = niceTicks(Math.min(...values, zeroLine ? 0 : Infinity), Math.max(...values, zeroLine ? 0 : -Infinity));
  const [yMin, yMax] = [ticks[0], ticks[ticks.length - 1]];
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (years.length > 1 ? index / (years.length - 1) * plotW : plotW / 2);
  const y = (value: number) => PAD.top + (yMax - value) / (yMax - yMin || 1) * plotH;
  const path = (items: (number | null)[]) => items.map((value, index) => value === null ? '' : `${index === 0 || items[index - 1] === null ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join('');
  const labelEvery = width < 420 ? 2 : 1;

  function onPointer(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - box.left - PAD.left) / plotW * (years.length - 1);
    setActive(Math.max(0, Math.min(years.length - 1, Math.round(position))));
  }
  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setActive(current => Math.max(0, Math.min(years.length - 1, (current ?? years.length - 1) + (event.key === 'ArrowRight' ? 1 : -1))));
  }

  // End labels: keep them apart when the two lines finish close together.
  const ends = series.map(item => ({ item, value: item.values[item.values.length - 1] })).filter(end => end.value !== null) as { item: LineSeries; value: number }[];
  const endY = ends.map(end => y(end.value));
  if (endY.length === 2 && Math.abs(endY[0] - endY[1]) < 16) {
    const mid = (endY[0] + endY[1]) / 2;
    const upper = endY[0] <= endY[1] ? 0 : 1;
    endY[upper] = mid - 8; endY[1 - upper] = mid + 8;
  }
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), 80), width - 80);

  return <figure className="ctx-chart">
    <figcaption className="ctx-chart-title">{title}</figcaption>
    <div className="ctx-legend" aria-hidden="true">{series.map(item => <span key={item.id}><i style={{ background: item.color }}/>{item.label}</span>)}</div>
    <div className="ctx-plot" ref={ref}>
      <svg width={width} height={HEIGHT} role="img" aria-label={`${title}. ${ariaSummary} Usa las flechas para recorrer los años.`} tabIndex={0}
        onPointerMove={onPointer} onPointerLeave={() => setActive(null)} onFocus={() => setActive(years.length - 1)} onBlur={() => setActive(null)} onKeyDown={onKey}>
        {ticks.map(tick => <g key={tick}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className={tick === 0 && zeroLine ? 'ctx-zero' : 'ctx-grid'}/>
          <text x={PAD.left - 8} y={y(tick)} className="ctx-tick" textAnchor="end" dominantBaseline="middle">{formatTick(tick)}</text>
        </g>)}
        {years.map((year, index) => index % labelEvery === (years.length - 1) % labelEvery && <text key={year} x={x(index)} y={HEIGHT - 8} className="ctx-tick" textAnchor="middle">{year}</text>)}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} className="ctx-crosshair"/>}
        {series.map(item => <path key={item.id} d={path(item.values)} fill="none" stroke={item.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>)}
        {series.map(item => {
          const index = active ?? item.values.length - 1;
          const value = item.values[index];
          return value === null ? null : <circle key={item.id} cx={x(index)} cy={y(value)} r={4} fill={item.color} stroke="#fff" strokeWidth={2}/>;
        })}
        {ends.map((end, index) => <text key={end.item.id} x={width - PAD.right + 8} y={endY[index]} className="ctx-end-label" dominantBaseline="middle">{format(end.value)}</text>)}
      </svg>
      {active !== null && <div className="ctx-tooltip" style={{ left: tooltipLeft }} role="status">
        <b>{years[active]}</b>
        {series.map(item => <span key={item.id}><i style={{ background: item.color }}/><strong>{item.values[active] === null ? '—' : format(item.values[active] as number)}</strong> {item.label}</span>)}
      </div>}
    </div>
    <details className="ctx-table">
      <summary>Ver los datos en una tabla</summary>
      <table>
        <thead><tr><th scope="col">Año</th>{series.map(item => <th scope="col" key={item.id}>{item.label}</th>)}</tr></thead>
        <tbody>{years.map((year, index) => <tr key={year}><th scope="row">{year}</th>{series.map(item => <td key={item.id}>{item.values[index] === null ? '—' : format(item.values[index] as number)}</td>)}</tr>)}</tbody>
      </table>
    </details>
  </figure>;
}
