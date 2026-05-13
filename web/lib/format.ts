export function formatCurrency(value: number, currency: string | null = "USD"): string {
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function roasColor(roas: number): string {
  if (roas >= 500) return "text-success";
  if (roas >= 200) return "text-accent";
  if (roas >= 100) return "text-warning";
  return "text-danger";
}

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  "2": "search",
  "3": "display",
  "4": "shopping",
  "5": "hotel",
  "6": "video",
  "7": "multi-channel",
  "8": "local",
  "9": "smart",
  "10": "performance max",
  "11": "local services",
  "12": "demand gen",
  "13": "travel",
  SEARCH: "search",
  DISPLAY: "display",
  SHOPPING: "shopping",
  VIDEO: "video",
  PERFORMANCE_MAX: "performance max",
  DEMAND_GEN: "demand gen",
  LOCAL_SERVICES: "local services",
};

const BIDDING_STRATEGY_LABELS: Record<string, string> = {
  "1": "manual cpc",
  "2": "manual cpm",
  "3": "page one promoted",
  "4": "target spend",
  "5": "enhanced cpc",
  "6": "target cpa",
  "7": "target roas",
  "8": "maximize conversions",
  "9": "maximize conversion value",
  "10": "target impression share",
  "11": "commission",
  "13": "manual cpv",
  MANUAL_CPC: "manual cpc",
  ENHANCED_CPC: "enhanced cpc",
  TARGET_CPA: "target cpa",
  TARGET_ROAS: "target roas",
  MAXIMIZE_CONVERSIONS: "maximize conversions",
  MAXIMIZE_CONVERSION_VALUE: "maximize conversion value",
  TARGET_IMPRESSION_SHARE: "target impression share",
};

export function labelEnum(
  value: string | number | null | undefined,
  map: Record<string, string>
): string {
  if (value == null) return "—";
  const key = String(value);
  if (map[key]) return map[key];
  return key.toLowerCase().replace(/_/g, " ");
}

export function channelTypeLabel(value: string | number | null | undefined): string {
  return labelEnum(value, CHANNEL_TYPE_LABELS);
}

export function biddingStrategyLabel(value: string | number | null | undefined): string {
  return labelEnum(value, BIDDING_STRATEGY_LABELS);
}

export function formatPosition(position: number, digits = 1): string {
  if (!Number.isFinite(position) || position === 0) return "—";
  return position.toFixed(digits);
}

export function deltaClass(value: number, lowerIsBetter = false): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0001) return "text-muted";
  const positive = value > 0;
  const good = lowerIsBetter ? !positive : positive;
  return good ? "text-success" : "text-danger";
}

export function formatDeltaNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.5 && digits === 0) return "0";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatted}`;
}

export function formatDeltaPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const pct = value * 100;
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toFixed(digits)}pp`;
}

export function formatDeltaPosition(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
}
