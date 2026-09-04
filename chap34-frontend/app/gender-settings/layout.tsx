import type { Metadata } from "next";

// Per-session preference step of the photo funnel - functional, never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GenderSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
