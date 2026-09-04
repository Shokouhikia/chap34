import type { Metadata } from "next";

// Per-order tracking page keyed by order id - personal, never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OrderTrackingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
