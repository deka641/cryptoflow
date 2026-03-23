"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SentimentData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/ui/fade-in";

/** Map a 0-100 value to an arc angle (left = 180deg, right = 0deg). */
function valueToAngle(value: number): number {
  return 180 - (value / 100) * 180;
}

/** Convert polar coords (degrees) to cartesian, with 0deg = right, 90deg = up. */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  };
}

/** Build an SVG arc path between two angles (in degrees, 0 = right). */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const sweep = startDeg - endDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${sweep} 1 ${end.x} ${end.y}`;
}

// Gauge color segments: [startValue, endValue, color]
const SEGMENTS: [number, number, string][] = [
  [0, 25, "#ef4444"],    // red-500 (Extreme Fear)
  [25, 45, "#f97316"],   // orange-500 (Fear)
  [45, 55, "#eab308"],   // yellow-500 (Neutral)
  [55, 75, "#84cc16"],   // lime-500 (Greed)
  [75, 100, "#22c55e"],  // green-500 (Extreme Greed)
];

function getColor(value: number): string {
  for (const [low, high, color] of SEGMENTS) {
    if (value >= low && value < high) return color;
  }
  return SEGMENTS[SEGMENTS.length - 1][2];
}

/** Build a simple sparkline SVG path from an array of values. */
function sparklinePath(
  values: number[],
  width: number,
  height: number,
  padding: number,
): { line: string; area: string } {
  if (values.length < 2) return { line: "", area: "" };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const line = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const area = `${line} L${padding + innerW},${padding + innerH} L${padding},${padding + innerH} Z`;

  return { line, area };
}

function SentimentGaugeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <Skeleton className="h-[120px] w-[240px] rounded-t-full bg-slate-700" />
      <Skeleton className="h-4 w-32 bg-slate-700" />
      <Skeleton className="h-[40px] w-full bg-slate-700" />
    </div>
  );
}

export function SentimentGauge() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getMarketSentiment()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        /* sentiment is non-critical, fail silently */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <SentimentGaugeSkeleton />;
  if (!data) return null;

  const { value, value_classification, history } = data;

  // Gauge dimensions
  const svgW = 240;
  const svgH = 135;
  const cx = svgW / 2;
  const cy = 120;
  const outerR = 100;
  const innerR = 72;
  const midR = (outerR + innerR) / 2;
  const bandWidth = outerR - innerR;

  // Needle angle (180 = left, 0 = right)
  const needleAngle = valueToAngle(value);
  const needleTip = polarToCartesian(cx, cy, outerR - 4, needleAngle);
  const needleColor = getColor(value);

  // Sparkline from history (oldest to newest, reverse API order)
  const historyValues = [...history].reverse().map((d) => d.value);

  const sparkW = 220;
  const sparkH = 40;
  const sparkPad = 2;
  const spark = sparklinePath(historyValues, sparkW, sparkH, sparkPad);

  // Determine if the trend is positive (latest > oldest)
  const trendPositive = historyValues.length >= 2 && historyValues[historyValues.length - 1] >= historyValues[0];
  const sparkStroke = trendPositive ? "#34d399" : "#f87171";
  const sparkFill = trendPositive ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)";

  return (
    <FadeIn>
      <div className="flex flex-col items-center gap-2">
        {/* Gauge */}
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
          {/* Color band segments */}
          {SEGMENTS.map(([low, high, color]) => {
            const startAngle = 180 - (low / 100) * 180;
            const endAngle = 180 - (high / 100) * 180;
            return (
              <path
                key={low}
                d={arcPath(cx, cy, midR, startAngle, endAngle)}
                fill="none"
                stroke={color}
                strokeWidth={bandWidth}
                strokeLinecap="butt"
                opacity={0.3}
              />
            );
          })}

          {/* Active highlight: arc from 0 to current value */}
          {value > 0 && (
            <path
              d={arcPath(cx, cy, midR, 180, 180 - (value / 100) * 180)}
              fill="none"
              stroke={needleColor}
              strokeWidth={bandWidth}
              strokeLinecap="butt"
              opacity={0.7}
            />
          )}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={needleColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={5} fill={needleColor} />
          <circle cx={cx} cy={cy} r={2.5} fill="#0f172a" />

          {/* Value text */}
          <text
            x={cx}
            y={cy - 28}
            textAnchor="middle"
            className="text-3xl font-bold"
            fill="white"
            fontSize={32}
            fontWeight={700}
          >
            {value}
          </text>

          {/* Labels at edges */}
          <text x={cx - outerR - 2} y={cy + 14} textAnchor="start" fill="#94a3b8" fontSize={10}>
            0
          </text>
          <text x={cx + outerR + 2} y={cy + 14} textAnchor="end" fill="#94a3b8" fontSize={10}>
            100
          </text>
        </svg>

        {/* Classification */}
        <p className="text-sm font-semibold" style={{ color: needleColor }}>
          {value_classification}
        </p>

        {/* 30-day sparkline */}
        {spark.line && (
          <div className="w-full mt-1">
            <p className="text-xs text-slate-500 mb-1 text-center">30-day trend</p>
            <svg
              width="100%"
              height={sparkH}
              viewBox={`0 0 ${sparkW} ${sparkH}`}
              preserveAspectRatio="none"
              className="w-full"
            >
              <path d={spark.area} fill={sparkFill} />
              <path
                d={spark.line}
                fill="none"
                stroke={sparkStroke}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
