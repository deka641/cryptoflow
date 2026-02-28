"use client";

import { useState, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const pwChecks = useMemo(() => {
    const hasLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const allMet = hasLength && hasLetter && hasDigit;
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    let strength: "none" | "weak" | "medium" | "strong" = "none";
    if (password.length === 0) strength = "none";
    else if (!allMet) strength = "weak";
    else if (password.length >= 16 && hasSpecial) strength = "strong";
    else if (password.length >= 12) strength = "medium";
    else strength = "weak";

    return { hasLength, hasLetter, hasDigit, allMet, strength };
  }, [password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
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
      await register(email, password, fullName || undefined);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-md bg-slate-800/60 border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-black/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
            <UserPlus className="size-6" />
          </div>
          <CardTitle className="text-2xl text-white">Create account</CardTitle>
          <CardDescription className="text-slate-400">
            Get started with CryptoFlow
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
              <Label htmlFor="fullName" className="text-slate-300">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all duration-200"
                autoComplete="name"
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
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
              {password.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    {[
                      { met: pwChecks.hasLength, label: "8+ characters" },
                      { met: pwChecks.hasLetter, label: "Contains a letter" },
                      { met: pwChecks.hasDigit, label: "Contains a digit" },
                    ].map((rule) => (
                      <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                        {rule.met ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <X className="size-3.5 text-red-400" />
                        )}
                        <span className={rule.met ? "text-emerald-400" : "text-red-400"}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          pwChecks.strength === "none" && "w-0",
                          pwChecks.strength === "weak" && "w-1/3 bg-red-500",
                          pwChecks.strength === "medium" && "w-2/3 bg-yellow-500",
                          pwChecks.strength === "strong" && "w-full bg-emerald-500",
                        )}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      pwChecks.strength === "weak" && "text-red-400",
                      pwChecks.strength === "medium" && "text-yellow-400",
                      pwChecks.strength === "strong" && "text-emerald-400",
                    )}>
                      {pwChecks.strength === "weak" && "Weak"}
                      {pwChecks.strength === "medium" && "Medium"}
                      {pwChecks.strength === "strong" && "Strong"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110"
              disabled={loading || !pwChecks.allMet}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
