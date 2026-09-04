import type { MetadataRoute } from "next";
import { getSeoSettings, getSiteBaseUrl } from "@/lib/seo";

// Blocks crawling of every private/personalized/functional route. This is
// a crawling hint, not a de-indexing guarantee - each of these routes also
// carries its own `noindex` metadata (see each page's/layout's metadata
// export) since robots.txt alone can't remove an already-linked URL from
// the index.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoSettings();
  const baseUrl = getSiteBaseUrl(seo);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/panel",
        "/account",
        "/checkout",
        "/orders",
        "/login",
        "/capture",
        "/generating",
        "/processing",
        "/result",
        "/gender-settings",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
