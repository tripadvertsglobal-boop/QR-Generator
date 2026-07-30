// Structured data for search engines. Rendered as a plain script tag rather
// than next/script because JSON-LD is never executed — it only has to be in the
// markup when a crawler parses the page.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Server-rendered from our own config, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
