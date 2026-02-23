import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700">
        <span className="text-3xl font-bold text-white">404</span>
      </div>
      <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
      <p className="max-w-md text-slate-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
