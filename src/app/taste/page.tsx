import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTaste } from '@/lib/content/taste';
import { TasteShelf } from '@/components/TasteShelf';

export const metadata: Metadata = {
  title: 'Taste',
  description: 'Three to five things currently reading, watching, listening to. Not lifetime favourites — just what\'s in rotation right now.',
};

export default async function TastePage() {
  const taste = await getTaste();
  if (!taste) notFound();
  return <TasteShelf taste={taste} />;
}
