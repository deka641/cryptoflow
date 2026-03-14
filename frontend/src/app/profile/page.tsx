"use client";

import { useState } from "react";
import Link from "next/link";
import { User as UserIcon, Lock, Bell, Briefcase, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/hooks/use-alerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/ui/fade-in";
import { formatCurrency } from "@/lib/formatters";

export default function ProfilePage() {
  const { user } = useAuth();
  const { alerts } = useAlerts();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-indigo-500/15">
          <UserIcon className="size-10 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Profile</h2>
          <p className="text-slate-400 max-w-md">
            Sign in to view and manage your account settings.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button variant="outline" asChild className="border-slate-700 text-slate-300">
            <Link href="/auth/register">Create Account</Link>
          </Button>
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => !a.triggered);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      toast.error("Password must be at least 8 characters with at least one letter and one digit");
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error((err as Error).message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Profile</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage your account settings and preferences.
        </p>
      </div>

      <FadeIn>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="size-5 text-indigo-400" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Email</Label>
                <p className="text-white mt-1">{user.email}</p>
              </div>
              {user.full_name && (
                <div>
                  <Label className="text-slate-400 text-xs uppercase tracking-wider">Name</Label>
                  <p className="text-white mt-1">{user.full_name}</p>
                </div>
              )}
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Status</Label>
                <p className="mt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lock className="size-5 text-amber-400" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500">Min 8 characters, at least one letter and one digit</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bell className="size-5 text-cyan-400" />
                Active Alerts
                {activeAlerts.length > 0 && (
                  <span className="ml-auto rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-400">
                    {activeAlerts.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">No active alerts. Set alerts from any coin detail page.</p>
              ) : (
                <div className="space-y-2">
                  {activeAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        {alert.image_url && (
                          <img src={alert.image_url} alt={alert.name} width={20} height={20} className="size-5 rounded-full" />
                        )}
                        <span className="text-sm font-medium text-white">{alert.symbol.toUpperCase()}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${alert.direction === "above" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {alert.direction}
                        </span>
                      </div>
                      <span className="text-sm text-slate-300">{formatCurrency(alert.target_price)}</span>
                    </div>
                  ))}
                  {activeAlerts.length > 5 && (
                    <p className="text-xs text-slate-500 text-center">+{activeAlerts.length - 5} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Briefcase className="size-5 text-emerald-400" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" asChild className="w-full justify-start border-slate-700 text-slate-300 hover:text-white">
                <Link href="/portfolio">
                  <Briefcase className="size-4 mr-2" />
                  Portfolio
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start border-slate-700 text-slate-300 hover:text-white">
                <Link href="/market">
                  <Bell className="size-4 mr-2" />
                  Market &amp; Watchlist
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </FadeIn>
    </div>
  );
}
