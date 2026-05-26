import type { Metadata } from 'next';
import { getGalleryFieldwork } from '@/lib/content/fieldwork';
import { Gallery } from '@/components/Gallery';

const DESCRIPTION = 'Atmospheric loops, one per Fieldwork piece. Scroll across.';

export const metadata: Metadata = {
  title: 'Gallery',
  description: DESCRIPTION,
  openGraph: {
    title: 'Gallery — bines.ai',
    description: DESCRIPTION,
    images: ['/media/fw07/poster.jpg'],
    type: 'website',
  },
};

export default async function GalleryPage() {
  const pieces = await getGalleryFieldwork();
  return (
    <div className="space-y-8">
      <header className="mb-4">
        <h1 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">Gallery</h1>
        <p className="mt-3 font-serif text-base text-ink/70 italic">{DESCRIPTION}</p>
      </header>
      <Gallery pieces={pieces} />
    </div>
  );
}
