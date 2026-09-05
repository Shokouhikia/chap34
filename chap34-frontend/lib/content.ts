// Server-side helper for reading the admin-managed business info + legal
// page bodies (contact/about/terms/privacy/refund/user-content). Used by
// the static legal pages and the footer - never import from a client
// component.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type BusinessInfo = {
  biz_phone: string;
  biz_email: string;
  biz_address: string;
  biz_instagram: string;
  legal_about: string;
  legal_terms: string;
  legal_privacy: string;
  legal_user_content_terms: string;
  legal_refund_policy: string;
};

const EMPTY_INFO: BusinessInfo = {
  biz_phone: "",
  biz_email: "",
  biz_address: "",
  biz_instagram: "",
  legal_about: "",
  legal_terms: "",
  legal_privacy: "",
  legal_user_content_terms: "",
  legal_refund_policy: "",
};

// Revalidated every 5 minutes, same rationale as lib/seo.ts.
const REVALIDATE_SECONDS = 300;

export async function getBusinessInfo(): Promise<BusinessInfo> {
  try {
    const res = await fetch(`${API_URL}/api/content/business-info`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return EMPTY_INFO;
    const data = await res.json();
    return { ...EMPTY_INFO, ...data };
  } catch {
    return EMPTY_INFO;
  }
}
