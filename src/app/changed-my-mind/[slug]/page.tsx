import { notFound } from 'next/navigation';
import {
  getAllFieldwork,
  validateChangedMyMindReferences,
} from '@/lib/content/fieldwork';
import { ChangedMyMindArticle } from '@/components/ChangedMyMindArticle';
import { JsonLd } from '@/components/JsonLd';
import { articleJsonLd } from '@/lib/seo/json-ld';

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
  const ld = articleJsonLd({
    slug: piece.frontmatter.slug,
    title: piece.frontmatter.title,
    description: piece.frontmatter.excerpt,
    published: piece.frontmatter.published,
    revised: piece.frontmatter.revised,
    tags: piece.frontmatter.tags,
    type: 'changed-my-mind',
  });
  return (
    <>
      <JsonLd data={ld} />
      <ChangedMyMindArticle piece={piece} />
    </>
  );
}
