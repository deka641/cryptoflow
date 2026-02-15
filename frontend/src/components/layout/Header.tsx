"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/providers/auth-provider";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { SidebarNav } from "./Sidebar";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/market": "Market",
  "/compare": "Compare",
  "/portfolio": "Portfolio",
  "/analytics": "Analytics",
  "/pipeline": "Pipeline",
  "/quality": "Quality",
  "/how-it-works": "How It Works",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/coins/")) return "Coin Detail";
  if (pathname.startsWith("/auth/login")) return "Login";
  if (pathname.startsWith("/auth/register")) return "Register";
  return "CryptoFlow";
}

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { connected } = useLivePricesContext();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-700/50 bg-slate-950/70 backdrop-blur-xl px-4 lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white">
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 p-0">
          <SheetHeader className="flex h-16 items-center gap-2 px-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25">
                CF
              </div>
              <SheetTitle className="text-lg font-bold text-white tracking-tight">
                CryptoFlow
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="py-4">
            <SidebarNav />
          </div>
        </SheetContent>
      </Sheet>

      <h1 className="text-lg font-semibold text-white">{title}</h1>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span
            className={`size-2.5 rounded-full transition-all duration-300 ${
              connected
                ? "bg-emerald-500 animate-[pulse-dot_2s_infinite_ease-in-out] shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                : "bg-slate-600"
            }`}
          />
          <span className="hidden sm:inline">
            {connected ? "Live" : "Offline"}
          </span>
        </div>

        {user ? (
          <Avatar size="sm">
            <AvatarFallback className="bg-indigo-600 text-white text-xs">
              {user.full_name
                ? user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : user.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login" className="text-slate-400 hover:text-white">
              <User className="size-4 mr-1" />
              Login
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
