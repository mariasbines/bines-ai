import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllPostcards, getPostcardByNumber } from '@/lib/content/postcards';
import { PostcardArticle } from '@/components/PostcardArticle';
import { padNumber } from '@/lib/utils/number';

export async function generateStaticParams() {
  const postcards = await getAllPostcards();
  return postcards.map((pc) => ({ number: padNumber(pc.frontmatter.number) }));
}

interface PageProps {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number: numberParam } = await params;
  const n = Number(numberParam);
  if (!Number.isInteger(n) || n <= 0) return {};
  const pc = await getPostcardByNumber(n);
  if (!pc) return {};
  const padded = padNumber(pc.frontmatter.number);
  const snippet = pc.body.trim().replace(/\s+/g, ' ').slice(0, 200);
  return {
    title: `Postcard #${padded}`,
    description: snippet,
    openGraph: {
      title: `Postcard #${padded}`,
      description: snippet,
      type: 'article',
      publishedTime: pc.frontmatter.published,
    },
  };
}

export default async function PostcardPage({ params }: PageProps) {
  const { number: numberParam } = await params;
  const n = Number(numberParam);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const pc = await getPostcardByNumber(n);
  if (!pc) notFound();
  return <PostcardArticle postcard={pc} />;
}
