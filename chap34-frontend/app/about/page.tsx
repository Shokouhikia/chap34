import type { Metadata } from "next";
import LegalPage from "@/app/_components/LegalPage";
import { getBusinessInfo } from "@/lib/content";

export const metadata: Metadata = { title: "درباره ما" };

export default async function AboutPage() {
  const info = await getBusinessInfo();
  return <LegalPage title="درباره ما" body={info.legal_about} />;
}
