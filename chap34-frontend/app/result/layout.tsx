import type { Metadata } from "next";

// Per-session generated-photo result page - personal, never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
