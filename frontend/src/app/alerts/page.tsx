"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Plus, Trash2, Pencil, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { useAlerts } from "@/hooks/use-alerts";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/ui/fade-in";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PriceAlert } from "@/types";

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EditAlertDialog({
  alert,
  open,
  onOpenChange,
  onSave,
}: {
  alert: PriceAlert;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number, data: { target_price?: number; direction?: string }) => Promise<unknown>;
}) {
  const [targetPrice, setTargetPrice] = useState(String(alert.target_price));
  const [direction, setDirection] = useState(alert.direction);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) return;
    setSaving(true);
    try {
      await onSave(alert.id, { target_price: price, direction });
      onOpenChange(false);
    } catch {
      // toast handled by hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            Edit Alert — {alert.symbol.toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Target Price (USD)</Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Direction</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={direction === "above" ? "default" : "outline"}
                size="sm"
                onClick={() => setDirection("above")}
                className={direction === "above" ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700 text-slate-300"}
              >
                <ArrowUp className="size-3.5 mr-1" /> Above
              </Button>
              <Button
                type="button"
                variant={direction === "below" ? "default" : "outline"}
                size="sm"
                onClick={() => setDirection("below")}
                className={direction === "below" ? "bg-red-600 hover:bg-red-700" : "border-slate-700 text-slate-300"}
              >
                <ArrowDown className="size-3.5 mr-1" /> Below
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AlertRow({
  alert,
  currentPrice,
  onDelete,
  onEdit,
}: {
  alert: PriceAlert;
  currentPrice: number | null;
  onDelete: (id: number) => void;
  onEdit: (alert: PriceAlert) => void;
}) {
  const distance =
    currentPrice && alert.target_price
      ? ((alert.target_price - currentPrice) / currentPrice) * 100
      : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
      {alert.image_url ? (
        <Image
          src={alert.image_url}
          alt={alert.name}
          width={32}
          height={32}
          className="size-8 rounded-full"
        />
      ) : (
        <div className="size-8 rounded-full bg-slate-700" />
      )}

      <Link href={`/coins/${alert.coin_id}`} className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{alert.name}</p>
        <p className="text-xs text-slate-400">{alert.symbol.toUpperCase()}</p>
      </Link>

      <div className="flex items-center gap-1.5 text-sm">
        {alert.direction === "above" ? (
          <ArrowUp className="size-3.5 text-emerald-400" />
        ) : (
          <ArrowDown className="size-3.5 text-red-400" />
        )}
        <span className="text-white font-medium">
          {formatCurrency(alert.target_price)}
        </span>
      </div>

      {currentPrice !== null && (
        <div className="text-right min-w-[80px]">
          <p className="text-xs text-slate-400">Current</p>
          <p className="text-sm text-white">{formatCurrency(currentPrice)}</p>
        </div>
      )}

      {distance !== null && (
        <div className="text-right min-w-[70px]">
          <p className="text-xs text-slate-400">Distance</p>
          <p
            className={`text-sm font-medium ${
              Math.abs(distance) < 5
                ? "text-amber-400"
                : "text-slate-300"
            }`}
          >
            {formatPercentage(distance)}
          </p>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(alert)}
        className="text-slate-400 hover:text-indigo-400 h-8 w-8 p-0"
        aria-label="Edit alert"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(alert.id)}
        className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
        aria-label="Delete alert"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function TriggeredRow({ alert }: { alert: PriceAlert }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/50 last:border-0">
      {alert.image_url ? (
        <Image
          src={alert.image_url}
          alt={alert.name}
          width={32}
          height={32}
          className="size-8 rounded-full"
        />
      ) : (
        <div className="size-8 rounded-full bg-slate-700" />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{alert.name}</p>
        <p className="text-xs text-slate-400">{alert.symbol.toUpperCase()}</p>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        {alert.direction === "above" ? (
          <ArrowUp className="size-3.5 text-emerald-400" />
        ) : (
          <ArrowDown className="size-3.5 text-red-400" />
        )}
        <span className="text-white">{formatCurrency(alert.target_price)}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-400">
        <Clock className="size-3" />
        {formatDateTime(alert.triggered_at)}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { user } = useAuth();
  const { prices } = useLivePricesContext();
  const {
    alerts,
    loading,
    updateAlert,
    deleteAlert,
    triggeredAlerts,
    triggeredLoading,
    triggeredPage,
    triggeredPagination,
    setTriggeredPage,
  } = useAlerts();
  const [tab, setTab] = useState("active");
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-indigo-500/15">
          <Bell className="size-10 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Price Alerts</h2>
          <p className="text-slate-400 max-w-md">
            Sign in to create price alerts and get notified when coins reach
            your target prices.
          </p>
        </div>
        <Button
          asChild
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const activeCount = activeAlerts.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Price Alerts</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage your price alerts. Create alerts from any{" "}
            <Link href="/market" className="text-indigo-400 hover:underline">
              coin detail page
            </Link>
            .
          </p>
        </div>
        <div className="text-sm text-slate-400">
          {activeCount}/20 active
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="border-b border-slate-700 pb-0">
          <TabsTrigger
            value="active"
            className="text-slate-400 data-[state=active]:text-white"
          >
            Active ({activeCount})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-slate-400 data-[state=active]:text-white"
          >
            History ({triggeredPagination.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="glass-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full bg-slate-700" />
                  ))}
                </div>
              ) : activeAlerts.length > 0 ? (
                <FadeIn>
                  {activeAlerts.map((alert) => {
                    const livePrice = prices[alert.coingecko_id] ?? null;
                    return (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        currentPrice={livePrice}
                        onDelete={deleteAlert}
                        onEdit={setEditingAlert}
                      />
                    );
                  })}
                </FadeIn>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bell className="size-12 text-slate-600 mb-4" />
                  <p className="text-lg font-medium text-slate-300">
                    No Active Alerts
                  </p>
                  <p className="text-sm text-slate-400 mt-2 max-w-md">
                    Set price alerts from any coin&apos;s detail page. You can
                    create up to 20 active alerts.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-6 border-slate-700 text-slate-300 hover:text-white"
                  >
                    <Link href="/market">Browse Market</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass-card">
            <CardContent className="p-0">
              {triggeredLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full bg-slate-700" />
                  ))}
                </div>
              ) : triggeredAlerts.length > 0 ? (
                <FadeIn>
                  {triggeredAlerts.map((alert) => (
                    <TriggeredRow key={alert.id} alert={alert} />
                  ))}
                </FadeIn>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="size-12 text-slate-600 mb-4" />
                  <p className="text-lg font-medium text-slate-300">
                    No Triggered Alerts Yet
                  </p>
                  <p className="text-sm text-slate-400 mt-2 max-w-md">
                    When your price alerts are triggered, they&apos;ll appear
                    here with timestamps.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {triggeredPagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-400">
                Showing page {triggeredPage} of {triggeredPagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={triggeredPage <= 1}
                  onClick={() => setTriggeredPage(triggeredPage - 1)}
                  className="border-slate-700 text-slate-300"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={triggeredPage >= triggeredPagination.pages}
                  onClick={() => setTriggeredPage(triggeredPage + 1)}
                  className="border-slate-700 text-slate-300"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingAlert && (
        <EditAlertDialog
          alert={editingAlert}
          open={!!editingAlert}
          onOpenChange={(open) => !open && setEditingAlert(null)}
          onSave={updateAlert}
        />
      )}
    </div>
  );
}
