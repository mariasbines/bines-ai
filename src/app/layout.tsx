import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { PageShell } from '@/components/PageShell';
import { JsonLd } from '@/components/JsonLd';
import { websiteJsonLd, personJsonLd } from '@/lib/seo/json-ld';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '500', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const SITE_URL = 'https://bines.ai';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'bines.ai',
    template: '%s · bines.ai',
  },
  description:
    'Notes on what AI is actually like to live with, and more. Fieldwork and postcards from Maria Bines.',
  icons: {
    icon: [{ url: '/stamp.svg', type: 'image/svg+xml' }],
  },
  alternates: {
    types: {
      'application/rss+xml': `${SITE_URL}/rss.xml`,
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Maria Bines',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <JsonLd data={websiteJsonLd()} />
        <JsonLd data={personJsonLd()} />
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
