// Renders JSON-LD structured data safely: only ever fed values Claude wrote
// here (site settings, order/article data resolved server-side) - never
// raw HTML from a user or admin text field. `<` is escaped so a value like
// site title containing "</script>" can't break out of the tag.
function JsonLdScript({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function OrganizationJsonLd({ name, url, logo }: { name: string; url: string; logo?: string }) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
  };
  if (logo) data.logo = logo;
  return <JsonLdScript data={data} />;
}
