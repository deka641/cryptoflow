const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      // Auto-logout on 401 (expired or invalid token)
      if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        window.dispatchEvent(new Event("auth:logout"));
      }
      const err = new Error(error.detail || `HTTP ${res.status}`);
      (err as Error & { status: number }).status = res.status;
      throw err;
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return res.json();
  }

  // Coins
  async getCoins(page = 1, perPage = 20, search = "") {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search) params.set("search", search);
    return this.request<import("@/types").PaginatedResponse<import("@/types").Coin>>(
      `/api/v1/coins?${params}`
    );
  }

  async getCoin(id: number) {
    return this.request<import("@/types").Coin>(`/api/v1/coins/${id}`);
  }

  async getCoinHistory(id: number, days = 30) {
    return this.request<import("@/types").CoinHistory>(`/api/v1/coins/${id}/history?days=${days}`);
  }

  async getCoinOHLCV(id: number, days = 30) {
    return this.request<import("@/types").CoinOHLCV>(`/api/v1/coins/${id}/ohlcv?days=${days}`);
  }

  async getCoinAnalytics(id: number, periodDays = 30) {
    return this.request<import("@/types").CoinAnalytics>(`/api/v1/coins/${id}/analytics?period_days=${periodDays}`);
  }

  // Market
  async getMarketOverview() {
    return this.request<import("@/types").MarketOverview>("/api/v1/market/overview");
  }

  async getKpiSparklines() {
    return this.request<import("@/types").KpiSparklines>("/api/v1/market/kpi-sparklines");
  }

  // Analytics
  async getCorrelation(periodDays = 30) {
    return this.request<import("@/types").CorrelationMatrix>(
      `/api/v1/analytics/correlation?period_days=${periodDays}`
    );
  }

  async getVolatility(periodDays = 30) {
    return this.request<import("@/types").VolatilityEntry[]>(
      `/api/v1/analytics/volatility?period_days=${periodDays}`
    );
  }

  async getVolatilityHistory(coinId: number) {
    return this.request<{
      coin_id: number;
      symbol: string;
      entries: { period_days: number; volatility: number | null; max_drawdown: number | null; sharpe_ratio: number | null; computed_at: string | null }[];
    }>(`/api/v1/analytics/volatility/${coinId}/history`);
  }

  // Pipeline
  async getPipelineRuns(page = 1, perPage = 20, dagId?: string) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (dagId) params.set("dag_id", dagId);
    return this.request<import("@/types").PaginatedResponse<import("@/types").PipelineRun>>(
      `/api/v1/pipeline/runs?${params}`
    );
  }

  async getPipelineHealth() {
    return this.request<import("@/types").PipelineHealth[]>("/api/v1/pipeline/health");
  }

  // Quality
  async getQualityChecks(page = 1, perPage = 20, status?: string, tableName?: string) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (status) params.set("status", status);
    if (tableName) params.set("table_name", tableName);
    return this.request<import("@/types").PaginatedResponse<import("@/types").QualityCheck>>(
      `/api/v1/quality/checks?${params}`
    );
  }

  async getQualitySummary() {
    return this.request<import("@/types").QualitySummary[]>("/api/v1/quality/summary");
  }

  // Sparklines
  async getSparklines(coinIds: number[]) {
    const ids = coinIds.join(",");
    return this.request<import("@/types").SparklineData[]>(
      `/api/v1/coins/sparklines?ids=${ids}`
    );
  }

  // Watchlist
  async getWatchlist() {
    return this.request<import("@/types").WatchlistResponse>("/api/v1/watchlist");
  }

  async addToWatchlist(coinId: number) {
    return this.request<void>(`/api/v1/watchlist/${coinId}`, { method: "POST" });
  }

  async removeFromWatchlist(coinId: number) {
    return this.request<void>(`/api/v1/watchlist/${coinId}`, { method: "DELETE" });
  }

  // Portfolio
  async getPortfolioSummary() {
    return this.request<import("@/types").PortfolioSummary>("/api/v1/portfolio");
  }

  async getPortfolioHoldings() {
    return this.request<import("@/types").PortfolioHolding[]>("/api/v1/portfolio/holdings");
  }

  async addPortfolioHolding(data: { coin_id: number; quantity: number; buy_price_usd: number; notes?: string }) {
    return this.request<import("@/types").PortfolioHolding>("/api/v1/portfolio/holdings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePortfolioHolding(id: number, data: { quantity?: number; buy_price_usd?: number; notes?: string }) {
    return this.request<import("@/types").PortfolioHolding>(`/api/v1/portfolio/holdings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePortfolioHolding(id: number) {
    return this.request<void>(`/api/v1/portfolio/holdings/${id}`, { method: "DELETE" });
  }

  async exportPortfolioCsv(): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${this.baseUrl}/api/v1/portfolio/export`, { headers });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  }

  async getPortfolioPerformance(days = 30) {
    return this.request<import("@/types").PortfolioPerformance>(`/api/v1/portfolio/performance?days=${days}`);
  }

  async getPortfolioBenchmark(days = 30, symbol = "btc") {
    return this.request<{ symbol: string; days: number; data_points: { timestamp: string; value: number }[] }>(
      `/api/v1/portfolio/benchmark?days=${days}&symbol=${symbol}`
    );
  }

  // Alerts
  async getAlerts() {
    return this.request<import("@/types").PriceAlert[]>("/api/v1/alerts");
  }

  async createAlert(data: { coin_id: number; target_price: number; direction: string }) {
    return this.request<import("@/types").PriceAlert>("/api/v1/alerts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteAlert(id: number) {
    return this.request<void>(`/api/v1/alerts/${id}`, { method: "DELETE" });
  }

  async checkAlerts() {
    return this.request<{ triggered: { alert_id: number; symbol: string; name: string; direction: string; target_price: number; current_price: number }[]; checked: number }>(
      "/api/v1/alerts/check",
      { method: "POST" }
    );
  }

  // Auth
  async register(email: string, password: string, fullName?: string) {
    return this.request<import("@/types").User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string; token_type: string }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", data.access_token);
    }
    return data;
  }

  async getMe() {
    return this.request<import("@/types").User>("/api/v1/auth/me");
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>("/api/v1/auth/password", {
      method: "PUT",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
  }
}

export const api = new ApiClient(API_BASE);
