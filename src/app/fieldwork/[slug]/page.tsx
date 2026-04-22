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

export default async function FieldworkPage({ params }: PageProps) {
  const { slug } = await params;
  const piece = await getFieldworkBySlug(slug);
  if (!piece) notFound();
  return <FieldworkArticle piece={piece} />;
}
