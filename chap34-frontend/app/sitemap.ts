import type { MetadataRoute } from "next";
import { getSeoSettings, getSiteBaseUrl } from "@/lib/seo";

// Public, indexable, evergreen pages: the landing page plus the static
// informational/legal pages (about/contact/terms/privacy/refund/track-order/
// user-content-terms). Everything else (capture/checkout/account/panels/
// authenticated order tracking) is a personalized or functional flow, not
// content, so it stays out of the sitemap (and is separately marked
// noindex - see robots.ts and each route's own metadata).
const STATIC_PAGES = [
  "/",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/user-content-terms",
  "/refund-policy",
  "/track-order",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoSettings();
  const baseUrl = getSiteBaseUrl(seo);

  return STATIC_PAGES.map((path) => ({
    url: path === "/" ? baseUrl : `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.5,
  }));
}
