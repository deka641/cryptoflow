"use client";

import { useState } from "react";

interface CorrelationHeatmapProps {
  coins: string[];
  matrix: (number | null)[][];
}

// Dark-friendly diverging palette: blue (negative) -> slate (zero) -> emerald (positive)
// All cells use white text for consistent readability
function getCorrelationColor(value: number | null): string {
  if (value === null) return "#1e293b";
  const clamped = Math.max(-1, Math.min(1, value));

  if (clamped >= 0) {
    // 0 -> +1: slate-700 -> emerald-700
    // Interpolate from #334155 to #047857
    const t = clamped;
    const r = Math.round(0x33 + (0x04 - 0x33) * t);
    const g = Math.round(0x41 + (0x78 - 0x41) * t);
    const b = Math.round(0x55 + (0x57 - 0x55) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // -1 -> 0: rose-700 -> slate-700
    // Interpolate from #be123c to #334155
    const t = Math.abs(clamped);
    const r = Math.round(0x33 + (0xbe - 0x33) * t);
    const g = Math.round(0x41 + (0x12 - 0x41) * t);
    const b = Math.round(0x55 + (0x3c - 0x55) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getTextColor(value: number | null): string {
  if (value === null) return "#475569";
  // Always white text on dark backgrounds for maximum contrast
  return "#f1f5f9";
}

export function CorrelationHeatmap({ coins, matrix }: CorrelationHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    row: string;
    col: string;
    value: number | null;
  } | null>(null);

  if (!coins.length || !matrix.length) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        No correlation data available
      </div>
    );
  }

  const cellSize = Math.min(60, Math.max(44, 500 / coins.length));
  const maxLabelLen = 5; // truncate long symbols

  return (
    <div className="relative overflow-x-auto">
      <div className="inline-block">
        {/* Header row */}
        <div className="flex" style={{ marginLeft: cellSize + 16 }}>
          {coins.map((coin) => (
            <div
              key={`header-${coin}`}
              className="flex items-center justify-center text-xs font-medium text-slate-400 uppercase"
              style={{ width: cellSize, height: 32 }}
            >
              {coin.length > maxLabelLen ? coin.slice(0, maxLabelLen) : coin}
            </div>
          ))}
        </div>

        {/* Matrix rows */}
        {matrix.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex items-center">
            <div
              className="flex items-center justify-end pr-2 text-xs font-medium text-slate-400 uppercase truncate"
              style={{ width: cellSize + 16 }}
              title={coins[rowIdx].toUpperCase()}
            >
              {coins[rowIdx].length > maxLabelLen ? coins[rowIdx].slice(0, maxLabelLen) : coins[rowIdx]}
            </div>
            {row.map((value, colIdx) => (
              <div
                key={`cell-${rowIdx}-${colIdx}`}
                className="flex items-center justify-center border border-slate-800/50 text-xs font-medium cursor-pointer transition-transform hover:scale-110 hover:z-10"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: getCorrelationColor(value),
                  color: getTextColor(value),
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    row: coins[rowIdx],
                    col: coins[colIdx],
                    value,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {value !== null ? value.toFixed(2) : "-"}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border border-slate-700/50 bg-slate-800/90 backdrop-blur-md px-3 py-2 shadow-xl shadow-black/20 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-xs text-slate-400">
            {tooltip.row.toUpperCase()} / {tooltip.col.toUpperCase()}
          </p>
          <p className="text-sm font-semibold text-white">
            {tooltip.value !== null ? tooltip.value.toFixed(4) : "N/A"}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
        <span>-1 (inverse)</span>
        <div
          className="h-3 w-48 rounded"
          style={{
            background:
              "linear-gradient(to right, #be123c, #6b2040, #334155, #1b5c46, #047857)",
          }}
        />
        <span>+1 (correlated)</span>
      </div>
    </div>
  );
}
