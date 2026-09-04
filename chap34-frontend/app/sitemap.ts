import type { MetadataRoute } from "next";
import { getSeoSettings, getSiteBaseUrl } from "@/lib/seo";

// The app has exactly one real public, indexable page: the landing page.
// Everything else (capture/checkout/account/panels/order tracking) is a
// personalized or authenticated flow, not evergreen content, so it stays
// out of the sitemap (and is separately marked noindex - see robots.ts and
// each route's own metadata).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoSettings();
  const baseUrl = getSiteBaseUrl(seo);

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
