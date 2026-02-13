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
      throw new Error(error.detail || `HTTP ${res.status}`);
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

  // Market
  async getMarketOverview() {
    return this.request<import("@/types").MarketOverview>("/api/v1/market/overview");
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

  // Pipeline
  async getPipelineRuns(page = 1, perPage = 20) {
    return this.request<import("@/types").PaginatedResponse<import("@/types").PipelineRun>>(
      `/api/v1/pipeline/runs?page=${page}&per_page=${perPage}`
    );
  }

  async getPipelineHealth() {
    return this.request<import("@/types").PipelineHealth[]>("/api/v1/pipeline/health");
  }

  // Quality
  async getQualityChecks(page = 1, perPage = 20) {
    return this.request<import("@/types").PaginatedResponse<import("@/types").QualityCheck>>(
      `/api/v1/quality/checks?page=${page}&per_page=${perPage}`
    );
  }

  async getQualitySummary() {
    return this.request<import("@/types").QualitySummary[]>("/api/v1/quality/summary");
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

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
  }
}

export const api = new ApiClient(API_BASE);
