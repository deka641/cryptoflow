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
              <footer className="border-t border-slate-800 px-4 py-4 lg:px-6">
                <div className="flex flex-col items-center gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between">
                  <span>CryptoFlow &mdash; Real-Time Crypto Analytics Platform</span>
                  <span>Market data provided by CoinGecko &middot; Prices may be delayed</span>
                </div>
              </footer>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </LivePricesProvider>
    </AuthProvider>
  );
}
