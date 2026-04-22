import { notFound } from 'next/navigation';
import { getTaste } from '@/lib/content/taste';
import { TasteShelf } from '@/components/TasteShelf';

export default async function TastePage() {
  const taste = await getTaste();
  if (!taste) notFound();
  return <TasteShelf taste={taste} />;
}
