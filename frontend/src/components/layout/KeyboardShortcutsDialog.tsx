"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-slate-600 bg-slate-700/50 px-1.5 font-mono text-xs font-medium text-slate-300">
      {children}
    </kbd>
  );
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-slate-400">
            Use these shortcuts to navigate quickly around CryptoFlow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </h3>
            <div className="space-y-1.5">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.path}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-800/50"
                >
                  <span className="text-slate-300">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-slate-600 text-xs">then</span>
                        )}
                        <Kbd>{key.toUpperCase()}</Kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              General
            </h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-800/50">
                <span className="text-slate-300">Search coins</span>
                <div className="flex items-center gap-1">
                  <Kbd>&#8984;</Kbd>
                  <Kbd>K</Kbd>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-800/50">
                <span className="text-slate-300">Show keyboard shortcuts</span>
                <div className="flex items-center gap-1">
                  <Kbd>?</Kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
