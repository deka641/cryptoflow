"use client";

import { Suspense, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
          <Skeleton className="h-96 w-full max-w-md bg-slate-700" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one digit");
      return;
    }

    try {
      setLoading(true);
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed. The token may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md bg-slate-800/60 border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="text-2xl text-white">Set New Password</CardTitle>
          <CardDescription className="text-slate-400">
            {success ? "Your password has been reset" : "Enter your new password below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                Password has been reset successfully. You can now sign in with your new password.
              </div>
              <Button
                onClick={() => router.push("/auth/login")}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110"
              >
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {!tokenFromUrl && (
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-slate-300">
                    Reset Token
                  </Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Paste your reset token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all duration-200"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters (letter + digit)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all duration-200"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110"
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>

              <p className="text-center text-sm text-slate-400">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="size-3" />
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
