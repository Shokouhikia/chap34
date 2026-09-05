import type { Metadata } from "next";
import LegalPage from "@/app/_components/LegalPage";
import { getBusinessInfo } from "@/lib/content";

export const metadata: Metadata = { title: "قوانین لغو سفارش و بازگشت وجه" };

export default async function RefundPolicyPage() {
  const info = await getBusinessInfo();
  return <LegalPage title="قوانین لغو سفارش و بازگشت وجه" body={info.legal_refund_policy} />;
}
