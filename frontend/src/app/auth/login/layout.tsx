import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to CryptoFlow to access your portfolio, watchlist, and personalized analytics.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
