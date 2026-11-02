'use client';

import { useEffect, useMemo, useState } from 'react';

type RegionValue = { name: string; value: number | null };
type Feature = { type: string; properties: { NAMEUNIT?: string; CodINE?: string | number }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][][] | number[][][] } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const geoJsonUrl = 'https://mapas.fomento.gob.es/arcgis/rest/services/SIU/ENTIDADES_TERRITORIALES_EGRN/MapServer/1/query?where=1%3D1&outFields=NAMEUNIT%2CCodINE&returnGeometry=true&outSR=4326&geometryPrecision=3&f=geojson';
const valueFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const nameByIneCode: Record<string, string> = { '01': 'andalucia', '02': 'aragon', '03': 'asturias', '04': 'islas baleares', '05': 'canarias', '06': 'cantabria', '07': 'castilla-la mancha', '08': 'castilla y leon', '09': 'cataluna', '10': 'comunitat valenciana', '11': 'extremadura', '12': 'galicia', '13': 'madrid', '14': 'murcia', '15': 'navarra', '16': 'pais vasco', '17': 'la rioja' };
function regionKey(feature: Feature) {
  const code = String(feature.properties.CodINE ?? '').padStart(2, '0');
  return nameByIneCode[code] ?? normalizeName(feature.properties.NAMEUNIT ?? '');
}

function normalizeName(value: string) {
  let name = value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const aliases: Record<string, string> = {
    'principado de asturias': 'asturias',
    'asturias, principado de': 'asturias',
    'comunidad valenciana': 'comunitat valenciana',
    'illes balears': 'islas baleares',
    'balears, illes': 'islas baleares',
    'comunidad autonoma de las islas baleares': 'islas baleares',
    'comunidad foral de navarra': 'navarra',
    'pais vasco': 'pais vasco',
    'comunidad de madrid': 'madrid',
    'comunidad autonoma de madrid': 'madrid',
    'madrid, comunidad de': 'madrid',
    'region de murcia': 'murcia',
    'comunidad autonoma de la region de murcia': 'murcia',
    'murcia, region de': 'murcia',
    'castilla-la mancha': 'castilla-la mancha',
    'castilla y leon': 'castilla y leon',
    'navarra, comunidad foral de': 'navarra',
    'rioja, la': 'la rioja',
  };
  return aliases[name] ?? name;
}

function getPolygons(feature: Feature) {
  return feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates as number[][][]]
    : feature.geometry.coordinates as number[][][][];
}

function featureBounds(feature: Feature): Bounds {
  const points = getPolygons(feature).flat(2);
  return points.reduce<Bounds>((bounds, point) => ({
    minX: Math.min(bounds.minX, point[0]), minY: Math.min(bounds.minY, point[1]),
    maxX: Math.max(bounds.maxX, point[0]), maxY: Math.max(bounds.maxY, point[1]),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

function makePath(feature: Feature, allBounds: Bounds, canaryBounds: Bounds, isCanary: boolean) {
  const width = isCanary ? 130 : 700;
  const height = isCanary ? 75 : 405;
  const left = isCanary ? 26 : 45;
  const top = isCanary ? 330 : 22;
  const bounds = isCanary ? canaryBounds : allBounds;
  const dx = Math.max(bounds.maxX - bounds.minX, 0.001);
  const dy = Math.max(bounds.maxY - bounds.minY, 0.001);
  const scale = Math.min(width / dx, height / dy);
  const drawnWidth = dx * scale;
  const drawnHeight = dy * scale;
  const offsetX = left + (width - drawnWidth) / 2;
  const offsetY = top + (height - drawnHeight) / 2;
  const project = (point: number[]) => [offsetX + (point[0] - bounds.minX) * scale, offsetY + (bounds.maxY - point[1]) * scale] as const;
  return getPolygons(feature).flatMap(polygon => polygon.map(ring => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z')).join(' ');
}

function interpolateColor(value: number, max: number, diverging: boolean) {
  if (diverging) {
    const t = Math.min(1, Math.abs(value) / Math.max(max, 1));
    const neutral = [240, 236, 220], end = value < 0 ? [190, 111, 73] : [54, 101, 68];
    return `rgb(${neutral.map((channel, index) => Math.round(channel + (end[index] - channel) * t)).join(',')})`;
  }
  const t = Math.max(0, Math.min(1, value / Math.max(max, 1)));
  const low = [232, 239, 228], high = [54, 101, 68];
  return `rgb(${low.map((channel, index) => Math.round(channel + (high[index] - channel) * t)).join(',')})`;
}

export default function RegionalMap({ communities, metricLabel, period }: { communities: RegionValue[]; metricLabel: string; period: string }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState(communities[0]?.name ?? '');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => { controller.abort(); setStatus('error'); }, 12000);
    fetch(geoJsonUrl, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('No se pudo cargar el mapa');
        return response.json() as Promise<FeatureCollection>;
      })
      .then(data => {
        if (!data.features?.length) throw new Error('El servicio no devolvió geometrías');
        setFeatures(data.features);
        setStatus('ready');
      })
      .catch(error => {
        if (error.name !== 'AbortError') setStatus('error');
      })
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, []);

  const regionsByName = useMemo(() => new Map(communities.map(region => [normalizeName(region.name), region])), [communities]);
  const diverging = metricLabel.toLocaleLowerCase('es').includes('saldo');
  const maxValue = Math.max(...communities.map(region => Math.abs(region.value ?? 0)), 1);
  const geometry = useMemo(() => {
    const mapped = features.map(feature => ({ feature, bounds: featureBounds(feature) }));
    const nonCanary = mapped.filter(item => !normalizeName(item.feature.properties.NAMEUNIT ?? '').includes('canarias'));
    const canaries = mapped.filter(item => normalizeName(item.feature.properties.NAMEUNIT ?? '').includes('canarias'));
    const bounds = (items: typeof mapped) => items.reduce<Bounds>((result, item) => ({ minX: Math.min(result.minX, item.bounds.minX), minY: Math.min(result.minY, item.bounds.minY), maxX: Math.max(result.maxX, item.bounds.maxX), maxY: Math.max(result.maxY, item.bounds.maxY) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const mainBounds = bounds(nonCanary);
    const canaryBounds = canaries.length ? bounds(canaries) : mainBounds;
    return mapped.map(item => {
      const isCanary = normalizeName(item.feature.properties.NAMEUNIT ?? '').includes('canarias');
      return { ...item, isCanary, path: makePath(item.feature, mainBounds, canaryBounds, isCanary) };
    });
  }, [features]);

  const selectedRegion = communities.find(region => region.name === selected) ?? communities[0];
  const selectedValue = selectedRegion?.value;

  return <div className="regional-map-card">
    <div className="regional-map-main">
      <div className="regional-map-visual">
        {status === 'loading' && <div className="map-status">Cargando límites oficiales de las comunidades…</div>}
        {status === 'error' && <div className="map-status map-error">No se pudieron cargar los límites ahora. La tabla completa de datos sigue disponible debajo.</div>}
        {status === 'ready' && <svg viewBox="0 0 780 430" role="group" aria-label={`Mapa de España por comunidades autónomas: ${metricLabel}, ${period}`}>
          {geometry.map(({ feature, path, isCanary }, featureIndex) => {
            const mapName = feature.properties.NAMEUNIT ?? '';
            const region = regionsByName.get(regionKey(feature));
            const value = region?.value ?? null;
            const isSelected = region?.name === selected;
            return <path key={`${feature.properties.CodINE ?? mapName}-${featureIndex}`} d={path} fill={value === null ? '#e7e9e4' : interpolateColor(value, maxValue, diverging)} className={`regional-map-shape${isSelected ? ' selected' : ''}${value === null ? ' no-data' : ''}`} tabIndex={region ? 0 : -1} role={region ? 'button' : undefined} aria-label={region ? `${region.name}: ${value === null ? 'sin dato comparable' : `${valueFormat.format(value)} millones de euros`}` : mapName} aria-pressed={region ? isSelected : undefined} onClick={() => region && setSelected(region.name)} onKeyDown={event => { if (region && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelected(region.name); } }}>
              <title>{region ? `${region.name}: ${value === null ? 'sin dato comparable' : `${valueFormat.format(value)} M€`}` : mapName}{isCanary ? ' · Islas Canarias (recuadro)' : ''}</title>
            </path>;
          })}
          <text x="27" y="420" className="map-inset-label">CANARIAS · RECUADRO</text>
        </svg>}
        <div className={`map-legend${diverging ? ' diverging' : ''}`}><span>{diverging ? `−${valueFormat.format(maxValue)} M€` : 'Menor'}</span><i/>{diverging && <span>0</span>}<span>{diverging ? `+${valueFormat.format(maxValue)} M€` : 'Mayor'}</span><span className="map-no-data-key"><i/>Sin dato comparable</span></div>
        <small className="map-attribution">Límites: <a href="https://mapas.fomento.gob.es/arcgis/rest/services/SIU/ENTIDADES_TERRITORIALES_EGRN/MapServer/1" target="_blank" rel="noreferrer">IGN · servicio cartográfico oficial ↗</a></small>
      </div>
      <aside className="map-selection" aria-live="polite">
        <label htmlFor="map-region-select">Selecciona una comunidad</label>
        <select id="map-region-select" value={selectedRegion?.name ?? ''} onChange={event => setSelected(event.target.value)}>{communities.map(region => <option key={region.name} value={region.name}>{region.name}</option>)}</select>
        <span>{metricLabel}</span>
        <strong>{selectedValue === null || selectedValue === undefined ? 'Sin dato comparable' : `${valueFormat.format(selectedValue)} M€`}</strong>
        <small>{period}</small>
        <p>El color compara solo las comunidades con dato para el indicador elegido. Pulsa una zona del mapa o usa el selector.</p>
      </aside>
    </div>
  </div>;
}
