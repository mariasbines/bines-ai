import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import { PullQuote } from './PullQuote';
import { Aside } from './Aside';
import { FigureCaption } from './FigureCaption';

interface MdxBodyProps {
  source: string;
}

const components = {
  PullQuote,
  Aside,
  FigureCaption,
};

/**
 * Compiles and renders MDX content using @mdx-js/mdx evaluate().
 * Server-only — invoked during SSG in the route handler.
 */
export async function MdxBody({ source }: MdxBodyProps) {
  // evaluate types expect a specific runtime shape; the jsx-runtime import
  // satisfies it at runtime — minimal cast for TS strict mode.
  const mod = await evaluate(source, {
    ...(runtime as unknown as Parameters<typeof evaluate>[1]),
    remarkPlugins: [remarkGfm],
  });
  const Body = mod.default;
  return <Body components={components} />;
}
