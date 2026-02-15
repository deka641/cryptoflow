"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Coin, PortfolioHolding } from "@/types";

interface AddHoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { coin_id: number; quantity: number; buy_price_usd: number; notes?: string }) => Promise<void>;
  onEdit?: (id: number, data: { quantity?: number; buy_price_usd?: number; notes?: string }) => Promise<void>;
  editHolding?: PortfolioHolding | null;
}

export function AddHoldingDialog({ open, onOpenChange, onAdd, onEdit, editHolding }: AddHoldingDialogProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [coinId, setCoinId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.getCoins(1, 50).then((res) => {
      if (!cancelled) setCoins(res.items);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (editHolding) {
      setCoinId(editHolding.coin_id);
      setQuantity(String(editHolding.quantity));
      setBuyPrice(String(editHolding.buy_price_usd));
      setNotes(editHolding.notes ?? "");
    } else {
      setCoinId("");
      setQuantity("");
      setBuyPrice("");
      setNotes("");
    }
  }, [editHolding, open]);

  const handleCoinChange = (newCoinId: number) => {
    setCoinId(newCoinId);
    if (!buyPrice) {
      const coin = coins.find((c) => c.id === newCoinId);
      if (coin?.price_usd) {
        setBuyPrice(String(coin.price_usd));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(buyPrice);
    if (!qty || qty <= 0 || isNaN(price) || price < 0) return;

    setSubmitting(true);
    try {
      if (editHolding && onEdit) {
        await onEdit(editHolding.id, {
          quantity: qty,
          buy_price_usd: price,
          notes: notes || undefined,
        });
      } else {
        if (coinId === "") return;
        await onAdd({
          coin_id: coinId as number,
          quantity: qty,
          buy_price_usd: price,
          notes: notes || undefined,
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = !!editHolding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Holding" : "Add Holding"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="coin" className="text-slate-300">Coin</Label>
              <select
                id="coin"
                value={coinId}
                onChange={(e) => handleCoinChange(Number(e.target.value))}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a coin...</option>
                {coins.map((coin) => (
                  <option key={coin.id} value={coin.id}>
                    {coin.name} ({coin.symbol.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-300">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buy-price" className="text-slate-300">Buy Price (USD)</Label>
            <Input
              id="buy-price"
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              required
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-300">Notes (optional)</Label>
            <Input
              id="notes"
              type="text"
              placeholder="e.g., DCA purchase #3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || (!isEdit && coinId === "") || !quantity || !buyPrice}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? "Saving..." : isEdit ? "Update" : "Add Holding"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
