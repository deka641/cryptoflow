"use client";

import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col lg:pl-64">
          <Header />
          <main className="flex-1 p-4 lg:p-6">
            <div className="animate-[fade-in_0.3s_ease-out]">{children}</div>
          </main>
        </div>
      </div>
      <Toaster />
    </AuthProvider>
  );
}
