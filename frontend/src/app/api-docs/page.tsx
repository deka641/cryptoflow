"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Globe, Shield, Zap } from "lucide-react";

const endpoints = [
  {
    method: "GET",
    path: "/coins",
    description: "List coins with latest market data (paginated)",
    params: "page (default 1), per_page (1-50, default 20)",
  },
  {
    method: "GET",
    path: "/coins/{coin_id}",
    description: "Get a single coin with detailed market data",
    params: "coin_id (integer)",
  },
  {
    method: "GET",
    path: "/market/overview",
    description:
      "Market overview: total cap, volume, BTC dominance, top movers",
    params: "None",
  },
  {
    method: "GET",
    path: "/analytics/correlation",
    description: "Correlation matrix for top coins by market cap",
    params: "period_days (1-90, default 30)",
  },
  {
    method: "GET",
    path: "/analytics/volatility",
    description: "Volatility ranking with Sharpe ratio and max drawdown",
    params: "period_days (1-90, default 30)",
  },
];

const exampleResponse = `[
  {
    "id": 1,
    "symbol": "btc",
    "name": "Bitcoin",
    "market_cap_rank": 1,
    "price_usd": 67234.51,
    "market_cap": 1321000000000,
    "total_volume": 28500000000,
    "price_change_24h_pct": 2.34
  },
  {
    "id": 2,
    "symbol": "eth",
    "name": "Ethereum",
    "market_cap_rank": 2,
    "price_usd": 3456.78,
    "market_cap": 415000000000,
    "total_volume": 14200000000,
    "price_change_24h_pct": -0.87
  }
]`;

export default function ApiDocsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Public API</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
          Access CryptoFlow market data programmatically. The public API
          provides read-only access to coin prices, market overview, correlation
          matrices, and volatility data. No authentication required.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge
            variant="outline"
            className="bg-indigo-500/15 text-indigo-400 border-indigo-500/20"
          >
            REST API
          </Badge>
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
          >
            No Auth Required
          </Badge>
          <Badge
            variant="outline"
            className="bg-amber-500/15 text-amber-400 border-amber-500/20"
          >
            60 req/min Rate Limit
          </Badge>
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-400">
                <Globe className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Base URL</p>
                <p className="text-xs text-slate-400 font-mono">
                  /api/v1/public
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/15 p-2 text-amber-400">
                <Shield className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Rate Limit</p>
                <p className="text-xs text-slate-400">
                  60 requests per minute per IP
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
                <Zap className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Format</p>
                <p className="text-xs text-slate-400">
                  JSON responses, GET only
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Endpoints</CardTitle>
          <p className="text-sm text-slate-400">
            All endpoints are prefixed with{" "}
            <code className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs font-mono text-slate-300">
              /api/v1/public
            </code>
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="pb-3 text-left font-semibold text-slate-300">
                    Method
                  </th>
                  <th className="pb-3 text-left font-semibold text-slate-300">
                    Path
                  </th>
                  <th className="pb-3 text-left font-semibold text-slate-300">
                    Description
                  </th>
                  <th className="pb-3 text-left font-semibold text-slate-300">
                    Parameters
                  </th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr
                    key={ep.path}
                    className="border-b border-slate-800/60 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 font-mono text-[11px]"
                      >
                        {ep.method}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-300">
                      {ep.path}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {ep.description}
                    </td>
                    <td className="py-3 text-xs text-slate-400">
                      {ep.params}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Example request/response */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/15 p-2 text-violet-400">
              <Code className="size-5" />
            </div>
            <div>
              <CardTitle className="text-white">Example</CardTitle>
              <p className="text-sm text-slate-400">
                Fetch the first page of coins with market data
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Request
            </p>
            <div className="rounded-lg bg-slate-800/80 border border-slate-700/60 p-4 font-mono text-sm text-slate-300 overflow-x-auto">
              <span className="text-emerald-400">GET</span>{" "}
              /api/v1/public/coins?page=1&per_page=2
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Response
            </p>
            <div className="rounded-lg bg-slate-800/80 border border-slate-700/60 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              <pre className="whitespace-pre">{exampleResponse}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate limiting details */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-400">
          <p>
            The public API enforces a limit of{" "}
            <span className="font-semibold text-white">
              60 requests per minute
            </span>{" "}
            per IP address using a sliding window. When the limit is exceeded,
            the API returns a{" "}
            <code className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs font-mono text-amber-400">
              429 Too Many Requests
            </code>{" "}
            response.
          </p>
          <div className="rounded-lg bg-slate-800/80 border border-slate-700/60 p-4 font-mono text-xs text-slate-300">
            <pre className="whitespace-pre">{`{
  "detail": "Rate limit exceeded. Maximum 60 requests per minute."
}`}</pre>
          </div>
          <p>
            Responses include a{" "}
            <code className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs font-mono text-slate-300">
              Cache-Control: public, max-age=60
            </code>{" "}
            header. Caching responses on your end will help you stay within the
            rate limit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
