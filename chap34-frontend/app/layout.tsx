import type { Metadata } from "next";
import Script from "next/script";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import Shell from "./_components/Shell";
import { OrganizationJsonLd } from "./_components/JsonLd";
import { getSeoSettings, getSiteBaseUrl, toAbsoluteUrl, SEO_DEFAULTS } from "@/lib/seo";

const vazir = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazir",
  weight: ["400", "500", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  const baseUrl = getSiteBaseUrl(seo);
  const title = seo.seo_site_title || SEO_DEFAULTS.siteTitle;
  const description = seo.seo_site_description || SEO_DEFAULTS.siteDescription;
  const ogImage = toAbsoluteUrl(baseUrl, seo.seo_default_og_image || SEO_DEFAULTS.ogImage);

  return {
    metadataBase: new URL(baseUrl),
    title: { default: title, template: `%s | ${title}` },
    description,
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName: title,
      title,
      description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    ...(seo.seo_gsc_verification ? { verification: { google: seo.seo_gsc_verification } } : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seo = await getSeoSettings();
  const baseUrl = getSiteBaseUrl(seo);
  const gaId = seo.seo_ga_measurement_id;
  const gtmId = seo.seo_gtm_container_id;

  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazir.variable} font-vazir`}>
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <OrganizationJsonLd
          name={seo.seo_site_title || SEO_DEFAULTS.siteTitle}
          url={baseUrl}
          logo={toAbsoluteUrl(baseUrl, seo.seo_site_logo || SEO_DEFAULTS.logo)}
        />
        <Shell>{children}</Shell>
        {gtmId && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}
        {!gtmId && gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
