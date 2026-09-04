import type { Metadata } from "next";

// AI-generation waiting step - functional, never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GeneratingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
