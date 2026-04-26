import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getNow } from '@/lib/content/now';
import { NowBlock } from '@/components/NowBlock';

export const metadata: Metadata = {
  title: 'Now',
  description: 'Currently obsessed with, currently failing at, currently rereading.',
};

export default async function NowPage() {
  const now = await getNow();
  if (!now) notFound();
  return <NowBlock now={now} />;
}
