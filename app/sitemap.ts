import type { MetadataRoute } from 'next';
import igae from '../data/igae-latest.json';
import { siteUrl } from './lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  // The home page changes when a new month is published; the legal page rarely.
  const lastModified = igae.referencePeriod ? new Date(`${igae.referencePeriod}-01T00:00:00Z`) : new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/aviso-legal`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
