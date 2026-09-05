import type { Metadata } from "next";
import LegalPage from "@/app/_components/LegalPage";
import { getBusinessInfo } from "@/lib/content";

export const metadata: Metadata = { title: "شرایط استفاده از تصاویر کاربران" };

export default async function UserContentTermsPage() {
  const info = await getBusinessInfo();
  return <LegalPage title="شرایط استفاده از تصاویر کاربران" body={info.legal_user_content_terms} />;
}
