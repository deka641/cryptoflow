export interface Coin {
  id: number;
  coingecko_id: string;
  symbol: string;
  name: string;
  category: string | null;
  image_url: string | null;
  market_cap_rank: number | null;
  price_usd: number | null;
  market_cap: number | null;
  total_volume: number | null;
  price_change_24h_pct: number | null;
  description?: string | null;
  circulating_supply?: number | null;
  created_at: string;
}

export interface PricePoint {
  timestamp: string;
  price_usd: number | null;
}

export interface CoinHistory {
  coin_id: number;
  symbol: string;
  name: string;
  prices: PricePoint[];
}

export interface MarketOverview {
  total_market_cap: number;
  total_volume_24h: number;
  btc_dominance: number;
  active_coins: number;
  top_gainers: CoinMover[];
  top_losers: CoinMover[];
}

export interface CoinMover {
  id: number;
  symbol: string;
  name: string;
  image_url: string | null;
  price_usd: number;
  price_change_24h_pct: number;
}

export interface OHLCVPoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface CoinOHLCV {
  coin_id: number;
  symbol: string;
  name: string;
  candles: OHLCVPoint[];
}

export interface CorrelationMatrix {
  coins: string[];
  matrix: (number | null)[][];
  period_days: number;
  computed_at: string | null;
}

export interface VolatilityEntry {
  coin_id: number;
  symbol: string;
  name: string;
  volatility: number;
  max_drawdown: number | null;
  sharpe_ratio: number | null;
  period_days: number;
  market_cap: number | null;
  image_url: string | null;
}

export interface PipelineRun {
  id: number;
  dag_id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  records_processed: number;
  error_message: string | null;
  created_at: string;
}

export interface PipelineHealth {
  dag_id: string;
  last_run_status: string | null;
  last_run_time: string | null;
  data_freshness_minutes: number | null;
  is_healthy: boolean;
}

export interface QualityCheck {
  id: number;
  check_name: string;
  table_name: string;
  status: string;
  details: Record<string, unknown> | null;
  executed_at: string;
}

export interface QualitySummary {
  table_name: string;
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
