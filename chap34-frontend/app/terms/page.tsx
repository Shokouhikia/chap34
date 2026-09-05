import type { Metadata } from "next";
import LegalPage from "@/app/_components/LegalPage";
import { getBusinessInfo } from "@/lib/content";

export const metadata: Metadata = { title: "قوانین و مقررات" };

export default async function TermsPage() {
  const info = await getBusinessInfo();
  return <LegalPage title="قوانین و مقررات" body={info.legal_terms} />;
}
