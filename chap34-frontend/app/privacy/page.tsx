import type { Metadata } from "next";
import LegalPage from "@/app/_components/LegalPage";
import { getBusinessInfo } from "@/lib/content";

export const metadata: Metadata = { title: "حریم خصوصی" };

export default async function PrivacyPage() {
  const info = await getBusinessInfo();
  return <LegalPage title="حریم خصوصی" body={info.legal_privacy} />;
}
