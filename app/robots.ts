import type { MetadataRoute } from 'next';
import { siteUrl } from './lib/site-url';

export default function robots(): MetadataRoute.Robots {
  // Preview images are generated per link; they are not pages to index.
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/og'] }], sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl };
}
