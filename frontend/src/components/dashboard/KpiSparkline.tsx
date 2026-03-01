"use client";

interface KpiSparklineProps {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}

export function KpiSparkline({ data, positive, width = 64, height = 24 }: KpiSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return `${x},${y}`;
  });

  const pathD = `M${points.join(" L")}`;
  const stroke = positive ? "#34d399" : "#f87171";
  const fill = positive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)";

  // Area path: close at bottom
  const areaD = `${pathD} L${padding + innerW},${padding + innerH} L${padding},${padding + innerH} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="animate-fade-in"
    >
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
