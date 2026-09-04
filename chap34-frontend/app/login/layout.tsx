import type { Metadata } from "next";

// Login/OTP flow - functional, personal, and duplicate-content-prone
// (redirect query params) - never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
