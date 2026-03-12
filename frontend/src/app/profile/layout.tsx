import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your account settings, change your password, and view your active alerts.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
