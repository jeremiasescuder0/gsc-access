export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// GA4 devuelve landingPagePlusQueryString / pagePath como path sin dominio.
export function shortenPath(path: string, max = 60): string {
  if (!path) return "(not set)";
  return path.length > max ? path.slice(0, max - 1) + "…" : path;
}

// "20260901" → "01/09"
export function formatGa4Date(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}`;
}
