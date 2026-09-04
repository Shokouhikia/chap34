// Server-side helper for reading the admin-managed, publicly-safe SEO
// settings (site title/description/OG image/logo/GSC verification/GA-GTM
// ids) and the active redirect list. Used by generateMetadata, sitemap.ts,
// robots.ts and middleware.ts - never import this from a client component.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type SeoSettings = {
  base_url: string;
  seo_site_title: string;
  seo_site_description: string;
  seo_default_og_image: string;
  seo_site_logo: string;
  seo_gsc_verification: string;
  seo_ga_measurement_id: string;
  seo_gtm_container_id: string;
};

const EMPTY_SETTINGS: SeoSettings = {
  base_url: "",
  seo_site_title: "",
  seo_site_description: "",
  seo_default_og_image: "",
  seo_site_logo: "",
  seo_gsc_verification: "",
  seo_ga_measurement_id: "",
  seo_gtm_container_id: "",
};

/** Hardcoded fallbacks used only when the admin hasn't set a value yet. */
export const SEO_DEFAULTS = {
  siteTitle: "Chap34 — عکس پرسنلی با هوش مصنوعی",
  siteDescription: "یک عکس بگیر یا آپلود کن؛ هوش مصنوعی عکس پرسنلی استانداردت را آماده می‌کند.",
  ogImage: "/img/logo-wordmark.jpg",
  logo: "/img/logo-wordmark.jpg",
  baseUrl: "https://chap34-app.netlify.app",
};

// Revalidated every 5 minutes so an admin's change to SEO settings shows up
// without a redeploy, without hitting the backend on every single request.
const REVALIDATE_SECONDS = 300;

export async function getSeoSettings(): Promise<SeoSettings> {
  try {
    const res = await fetch(`${API_URL}/api/seo/settings`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return EMPTY_SETTINGS;
    const data = await res.json();
    return { ...EMPTY_SETTINGS, ...data };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export function getSiteBaseUrl(seo: SeoSettings): string {
  const raw = seo.base_url || SEO_DEFAULTS.baseUrl;
  return raw.replace(/\/+$/, "");
}

export function toAbsoluteUrl(baseUrl: string, pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export type RedirectEntry = {
  source_path: string;
  destination_path: string;
  status_code: number;
};

export async function getActiveRedirects(): Promise<RedirectEntry[]> {
  try {
    const res = await fetch(`${API_URL}/api/seo/redirects`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.redirects || [];
  } catch {
    return [];
  }
}
