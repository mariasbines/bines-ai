import 'server-only';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

/**
 * Very simple JSX-component-tag matcher. Strips opening + closing tags of
 * components named with a capital letter. Inner content is preserved.
 *
 * v1-adequate for our Fieldwork pieces (single-line <PullQuote>, <Aside>,
 * <FigureCaption> usage). Multi-line JSX with attributes spanning lines
 * will not be handled gracefully — those aren't in v1 content.
 */
const JSX_TAG_PATTERN = /<\/?[A-Z][A-Za-z0-9]*[^>]*>/g;

/**
 * Convert an MDX body string into a best-effort HTML string suitable for
 * RSS `<content:encoded>`. Strips custom JSX component tags, compiles the
 * remaining markdown via remark + remark-gfm + remark-html.
 *
 * Lossy: custom component formatting is lost (PullQuote styling, etc.).
 * Acceptable for feed readers which don't render our components anyway.
 */
export async function mdxBodyToHtml(body: string): Promise<string> {
  const stripped = body.replace(JSX_TAG_PATTERN, '');
  const result = await remark().use(remarkGfm).use(remarkHtml).process(stripped);
  return String(result);
}
