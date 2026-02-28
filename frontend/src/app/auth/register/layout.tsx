import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a free CryptoFlow account to track your portfolio and access personalized crypto analytics.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
