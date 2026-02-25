"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700">
        <AlertTriangle className="size-10 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="max-w-md text-slate-400">
        An unexpected error occurred. Please try again or return to the dashboard.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={reset} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
