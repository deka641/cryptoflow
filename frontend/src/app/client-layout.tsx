"use client";

import { AuthProvider } from "@/providers/auth-provider";
import { LivePricesProvider } from "@/providers/live-prices-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { PriceTicker } from "@/components/layout/PriceTicker";
import { KeyboardShortcutsDialog } from "@/components/layout/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
          <Header onOpenShortcuts={() => setShowHelp(true)} />
          <PriceTicker />
          <main id="main-content" className="flex-1 p-4 lg:p-6">
            <div className="animate-[fade-in_0.3s_ease-out]">{children}</div>
          </main>
          <footer className="border-t border-slate-800 px-4 py-4 lg:px-6">
            <div className="flex flex-col items-center gap-1 text-xs text-slate-400 sm:flex-row sm:justify-between">
              <span>CryptoFlow &mdash; Real-Time Crypto Analytics Platform</span>
              <span>Market data provided by CoinGecko &middot; Prices may be delayed</span>
            </div>
          </footer>
        </div>
      </div>
      <KeyboardShortcutsDialog open={showHelp} onOpenChange={setShowHelp} />
      <Toaster />
    </>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LivePricesProvider>
        <TooltipProvider>
          <LayoutInner>{children}</LayoutInner>
        </TooltipProvider>
      </LivePricesProvider>
    </AuthProvider>
  );
}
