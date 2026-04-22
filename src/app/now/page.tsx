import { notFound } from 'next/navigation';
import { getNow } from '@/lib/content/now';
import { NowBlock } from '@/components/NowBlock';

export default async function NowPage() {
  const now = await getNow();
  if (!now) notFound();
  return <NowBlock now={now} />;
}
