import type { Metadata } from "next";

// Multi-step personal checkout flow - never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
