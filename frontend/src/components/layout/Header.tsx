"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, User, LogOut, Briefcase, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  "/profile": "Profile",
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
  const router = useRouter();
  const { user, logout } = useAuth();
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
          <div className="flex flex-col h-[calc(100%-4rem)]">
            <div className="py-4 flex-1">
              <SidebarNav />
            </div>
            {user && (
              <div className="p-4 border-t border-slate-800">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  <LogOut className="size-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
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
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-slate-800/95 border-slate-700/50 backdrop-blur-md text-slate-300"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-white">
                    {user.full_name || user.email}
                  </p>
                  {user.full_name && (
                    <p className="text-xs text-slate-400">{user.email}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700/50" />
              <DropdownMenuItem asChild className="cursor-pointer hover:bg-slate-700/50 focus:bg-slate-700/50 focus:text-white">
                <Link href="/profile">
                  <UserCog className="size-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer hover:bg-slate-700/50 focus:bg-slate-700/50 focus:text-white">
                <Link href="/portfolio">
                  <Briefcase className="size-4 mr-2" />
                  Portfolio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700/50" />
              <DropdownMenuItem
                className="cursor-pointer hover:bg-slate-700/50 focus:bg-slate-700/50 focus:text-white"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                <LogOut className="size-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
