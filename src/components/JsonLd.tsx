interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Inline a schema.org JSON-LD block into the document. Server-rendered.
 * Stringification is deterministic enough that React's hydration warnings
 * stay quiet across renders.
 *
 * Don't pass user-controlled content here — `dangerouslySetInnerHTML` is
 * fine for static schema generators, NOT for visitor input.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
