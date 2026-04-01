"use client";

import { Suspense, useState, useMemo, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ArrowLeft, Check, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const pwChecks = useMemo(() => {
    const hasLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const allMet = hasLength && hasLetter && hasDigit;
    return { hasLength, hasLetter, hasDigit, allMet };
  }, [password]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "token") {
      setFieldErrors((prev) => ({ ...prev, token: token ? null : "Reset token is required" }));
    } else if (field === "password") {
      let pwError: string | null = null;
      if (!password) pwError = "Password is required";
      else if (!pwChecks.allMet) pwError = "Password does not meet all requirements";
      setFieldErrors((prev) => ({ ...prev, password: pwError }));
    }
  };

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
                    onBlur={() => handleBlur("token")}
                    aria-invalid={touched.token && !!fieldErrors.token}
                    aria-describedby={touched.token && fieldErrors.token ? "token-error" : undefined}
                    className={cn(
                      "bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all duration-200",
                      touched.token && fieldErrors.token && "border-red-500"
                    )}
                    required
                  />
                  {touched.token && fieldErrors.token && (
                    <p id="token-error" className="text-xs text-red-400">{fieldErrors.token}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters (letter + digit)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    aria-invalid={touched.password && !!fieldErrors.password}
                    aria-describedby="password-requirements"
                    className={cn(
                      "bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-400 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all duration-200 pr-10",
                      touched.password && fieldErrors.password && "border-red-500"
                    )}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {(password.length > 0 || touched.password) && (
                  <div id="password-requirements" className="space-y-1 pt-1">
                    {[
                      { met: pwChecks.hasLength, label: "8+ characters" },
                      { met: pwChecks.hasLetter, label: "At least one letter" },
                      { met: pwChecks.hasDigit, label: "At least one digit" },
                    ].map((rule) => (
                      <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                        {rule.met ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <X className="size-3.5 text-red-400" />
                        )}
                        <span className={rule.met ? "text-emerald-400" : "text-slate-400"}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110"
                disabled={loading || !pwChecks.allMet}
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
