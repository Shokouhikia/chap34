import type { Metadata } from "next";

// Camera-capture step of the photo funnel - functional, never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CaptureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
