import type { Metadata } from "next";

// Photo-processing waiting step - functional, never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProcessingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
