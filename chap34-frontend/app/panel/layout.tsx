import type { Metadata } from "next";
import PanelLayoutClient from "./PanelLayoutClient";

// Staff-only admin/atelier panels - never indexable, and blocked in
// robots.ts too.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelLayoutClient>{children}</PanelLayoutClient>;
}
