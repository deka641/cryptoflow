"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <LogIn className="size-6" />
          </div>
          <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in to your CryptoFlow account
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-sm text-slate-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
              >
                Create account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
