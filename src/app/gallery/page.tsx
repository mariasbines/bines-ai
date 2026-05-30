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
  return <Gallery pieces={pieces} description={DESCRIPTION} />;
}
