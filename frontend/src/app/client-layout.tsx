"use client";

import { AuthProvider } from "@/providers/auth-provider";
import { LivePricesProvider } from "@/providers/live-prices-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { PriceTicker } from "@/components/layout/PriceTicker";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LivePricesProvider>
        <TooltipProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
              <Header />
              <PriceTicker />
              <main className="flex-1 p-4 lg:p-6">
                <div className="animate-[fade-in_0.3s_ease-out]">{children}</div>
              </main>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </LivePricesProvider>
    </AuthProvider>
  );
}
