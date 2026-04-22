import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllFieldwork, getFieldworkBySlug } from '@/lib/content/fieldwork';
import { FieldworkArticle } from '@/components/FieldworkArticle';

export async function generateStaticParams() {
  const pieces = await getAllFieldwork();
  return pieces.map((p) => ({ slug: p.frontmatter.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const piece = await getFieldworkBySlug(slug);
  if (!piece) return {};
  return {
    title: piece.frontmatter.title,
    description: piece.frontmatter.excerpt,
    openGraph: {
      title: piece.frontmatter.title,
      description: piece.frontmatter.excerpt,
      type: 'article',
      publishedTime: piece.frontmatter.published,
    },
  };
}

export default async function FieldworkPage({ params }: PageProps) {
  const { slug } = await params;
  const piece = await getFieldworkBySlug(slug);
  if (!piece) notFound();
  return <FieldworkArticle piece={piece} />;
}
