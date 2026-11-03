import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './base.css';
import './components.css';
import './spacing.css';

export const metadata: Metadata = {
  title: 'España en tus manos — Presupuesto público',
  description: 'Explora los ingresos y gastos mensuales de las Administraciones públicas con datos oficiales de la IGAE y prueba tu propio escenario.',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/apple-icon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}
