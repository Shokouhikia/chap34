import type { Metadata } from "next";
import AccountLayoutClient from "./AccountLayoutClient";

// Personalized, auth-gated order history - never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
