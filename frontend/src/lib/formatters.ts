/**
 * Format a number as compact USD currency (e.g. "$1.23T", "$456B").
 */
export function formatCompactCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as USD price with appropriate decimal places.
 * Prices >= $1 show 2 decimals; prices < $1 show up to 6 decimals.
 */
export function formatCurrency(price: number | null): string {
  if (price === null) return "-";
  if (price >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price);
}

/**
 * Format a supply number in compact notation (e.g. "19.5M").
 */
export function formatSupply(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a percentage value with sign and 2 decimal places.
 */
export function formatPercentage(value: number | null): string {
  if (value === null) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/**
 * Format a quantity with appropriate decimal places.
 * Quantities >= 1 show up to 4 decimals; quantities < 1 show up to 8 decimals.
 */
export function formatQuantity(qty: number): string {
  if (qty >= 1) return qty.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return qty.toLocaleString("en-US", { maximumFractionDigits: 8 });
}
