import { notFound } from 'next/navigation';
import {
  getAllFieldwork,
  validateChangedMyMindReferences,
} from '@/lib/content/fieldwork';
import { ChangedMyMindArticle } from '@/components/ChangedMyMindArticle';

export async function generateStaticParams() {
  const all = await getAllFieldwork();
  validateChangedMyMindReferences(all); // build-time assertion (AC-003)
  const changed = all.filter((p) => p.frontmatter.status === 'changed-my-mind');
  return changed.map((p) => ({ slug: p.frontmatter.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChangedMyMindPage({ params }: PageProps) {
  const { slug } = await params;
  const all = await getAllFieldwork();
  const piece = all.find(
    (p) => p.frontmatter.slug === slug && p.frontmatter.status === 'changed-my-mind',
  );
  if (!piece) notFound();
  return <ChangedMyMindArticle piece={piece} />;
}
