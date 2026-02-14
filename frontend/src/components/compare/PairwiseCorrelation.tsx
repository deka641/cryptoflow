"use client";

interface PairwiseCorrelationProps {
  selectedSymbols: string[];
  allSymbols: string[];
  matrix: (number | null)[][];
  colors: string[];
}

function getCorrelationColor(value: number | null): string {
  if (value === null) return "#1e293b";
  const clamped = Math.max(-1, Math.min(1, value));

  if (clamped >= 0) {
    const t = clamped;
    const r = Math.round(0x33 + (0x04 - 0x33) * t);
    const g = Math.round(0x41 + (0x78 - 0x41) * t);
    const b = Math.round(0x55 + (0x57 - 0x55) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = Math.abs(clamped);
    const r = Math.round(0x33 + (0xbe - 0x33) * t);
    const g = Math.round(0x41 + (0x12 - 0x41) * t);
    const b = Math.round(0x55 + (0x3c - 0x55) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function PairwiseCorrelation({
  selectedSymbols,
  allSymbols,
  matrix,
  colors,
}: PairwiseCorrelationProps) {
  // Map selected symbols to indices in the full matrix
  const allSymbolsLower = allSymbols.map((s) => s.toLowerCase());
  const indices = selectedSymbols.map((sym) =>
    allSymbolsLower.indexOf(sym.toLowerCase())
  );

  const validCount = indices.filter((i) => i !== -1).length;

  if (validCount < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        Correlation data requires coins in the top 15 by market cap. Select at
        least 2 qualifying coins to see pairwise correlations.
      </div>
    );
  }

  const cellSize = 56;

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Header row */}
        <div className="flex" style={{ marginLeft: cellSize + 8 }}>
          {selectedSymbols.map((sym, idx) => (
            <div
              key={`h-${sym}`}
              className="flex items-center justify-center text-xs font-medium uppercase"
              style={{
                width: cellSize,
                height: 28,
                color: colors[idx] || "#94a3b8",
              }}
            >
              {sym}
            </div>
          ))}
        </div>

        {/* Rows */}
        {selectedSymbols.map((rowSym, rowIdx) => {
          const matrixRowIdx = indices[rowIdx];
          return (
            <div key={`r-${rowSym}`} className="flex items-center">
              <div
                className="flex items-center justify-end pr-2 text-xs font-medium uppercase"
                style={{
                  width: cellSize + 8,
                  color: colors[rowIdx] || "#94a3b8",
                }}
              >
                {rowSym}
              </div>
              {selectedSymbols.map((colSym, colIdx) => {
                const matrixColIdx = indices[colIdx];
                const value =
                  matrixRowIdx !== -1 && matrixColIdx !== -1
                    ? matrix[matrixRowIdx]?.[matrixColIdx] ?? null
                    : null;
                const isAvailable =
                  matrixRowIdx !== -1 && matrixColIdx !== -1;

                return (
                  <div
                    key={`c-${rowSym}-${colSym}`}
                    className="flex items-center justify-center border border-slate-800/50 text-xs font-medium"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getCorrelationColor(value),
                      color: isAvailable ? "#f1f5f9" : "#475569",
                    }}
                  >
                    {!isAvailable ? "N/A" : value !== null ? value.toFixed(2) : "-"}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
        <span>-1 (inverse)</span>
        <div
          className="h-2.5 w-36 rounded"
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
