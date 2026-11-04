import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Mono, DM_Sans, Manrope } from 'next/font/google';
import './base.css';
import './components.css';
import './spacing.css';

// Fonts are downloaded at build time and served from this site, so visitors'
// browsers never contact Google (privacy, and one fewer connection on load).
const display = Manrope({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://manage-your-country.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'España en tus manos — Presupuesto público',
  description: 'Explora los ingresos y gastos mensuales de las Administraciones públicas con datos oficiales de la IGAE y prueba tu propio escenario.',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/apple-icon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}
