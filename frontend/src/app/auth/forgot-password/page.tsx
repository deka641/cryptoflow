"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const result = await api.forgotPassword(email);
      setSubmitted(true);
      if (result.dev_token) {
        setDevToken(result.dev_token);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md bg-slate-800/60 border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
            <KeyRound className="size-6" />
          </div>
          <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
          <CardDescription className="text-slate-400">
            {submitted
              ? "Check your email for reset instructions"
              : "Enter your email to receive a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                If an account with that email exists, a password reset token has been generated.
              </div>
              {devToken && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Dev mode — reset token:</p>
                  <code className="block rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-amber-400 break-all">
                    {devToken}
                  </code>
                  <Link
                    href={`/auth/reset-password?token=${devToken}`}
                    className="block text-center text-sm text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
                  >
                    Use this token to reset password
                  </Link>
                </div>
              )}
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-slate-300"
              >
                <ArrowLeft className="size-4" />
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all duration-200"
                  autoComplete="email"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <p className="text-center text-sm text-slate-400">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
