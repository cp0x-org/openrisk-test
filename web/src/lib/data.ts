import type { CoverageCell, Feed, Protocol, Snapshot } from "./types";

export const fmtUsd = (v: number | null | undefined): string | null => {
  if (v == null || !Number.isFinite(v)) return null;
  if (v >= 1e9) return `${parseFloat((v / 1e9).toFixed(2))}B`;
  if (v >= 1e6) return `${parseFloat((v / 1e6).toFixed(1))}M`;
  if (v >= 1e3) return `${parseFloat((v / 1e3).toFixed(1))}K`;
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

export const cellOf = (p: Protocol, feedId: string): CoverageCell =>
  p.coverage[feedId] ?? { status: "n" };

export const coveredCount = (p: Protocol, feedIds: string[]): number =>
  feedIds.reduce((n, id) => {
    const s = cellOf(p, id).status;
    return n + (s === "c" || s === "p" ? 1 : 0);
  }, 0);

export const loadSnapshot = async (): Promise<Snapshot> => {
  const url = `${import.meta.env.BASE_URL}data/snapshot.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load snapshot: ${res.status}`);
  }
  return (await res.json()) as Snapshot;
};

export const dateInfo = (value?: string | null, now = Date.now()) => {
  const unknown = { label: "Date unavailable", age: null as number | null, older: false };
  if (!value || !/^\d{4}-\d{2}(?:-\d{2})?(?:T.*)?$/.test(value) || value.startsWith("1970-")) return unknown;
  const date = new Date(value.length === 7 ? `${value}-01T00:00:00Z` : value);
  if (!Number.isFinite(date.getTime()) || date.getTime() > now + 86400000) return unknown;
  const age = Math.max(0, Math.floor((now - date.getTime()) / 86400000));
  const label = date.toLocaleDateString("en-GB", {
    ...(value.length === 7 ? {} : { day: "numeric" }), month: "short", year: "numeric", timeZone: "UTC",
  });
  return { label, age, older: age > 90 };
};

export const metricOf = (p: Protocol) => ({ value: p.volumeMetric ? p.volume24hUsd : p.ethereumTvlUsd, label: p.volumeMetric ? "24h volume" : "Ethereum TVL" });
export const coverageLabel = (status: CoverageCell["status"]) => status === "c" ? "Available" : status === "p" ? "Partial scope" : "No data";

const FEED_GUIDES: Record<string, { topic: string; scope: string; question: string; note: string; shortName: string }> = {
  defiscan: { topic: "Decentralization", scope: "Protocol review", shortName: "DeFiScan", question: "Who controls the protocol?", note: "Stages 0–2 describe decentralization maturity. They do not measure every kind of financial or smart-contract risk. Individual dimensions use the provider’s L / M / H categories." },
  philidor: { topic: "Vault risk", scope: "Selected Ethereum vaults", shortName: "Philidor", question: "What are the risks of individual vaults?", note: "Philidor rates individual vaults, not the entire protocol. This collection shows a sample of up to three vaults per family. The vault count is not a risk score." },
  risklayer: { topic: "Protocol risk · Beta", scope: "Protocol analysis", shortName: "Risklayer", question: "What risks does the provider identify?", note: "Risklayer Beta publishes AI-assisted analyses. Findings may cover several networks and need verification at the source. This is risklayer.online; its relationship to the EigenLayer RiskLayer project has not been established." },
};
export const guideOf = (feed: Feed) => FEED_GUIDES[feed.id] ?? { topic: feed.type === "rating" ? "Risk assessment" : feed.type, scope: "Provider-defined scope", shortName: feed.name, question: "What does this source assess?", note: feed.focus };

export type VaultView = { name: string; version: string | null; tier: string | null; score: string | null; url: string | null; date: string | null };
const record = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const str = (v: unknown) => typeof v === "string" ? v : null;
export const vaultsOf = (cell: CoverageCell): VaultView[] => {
  const families = cell.raw?.families;
  if (!Array.isArray(families)) return [];
  return families.flatMap((family) => {
    const vaults = record(family)?.vaults;
    if (!Array.isArray(vaults)) return [];
    return vaults.flatMap((v) => {
      const item = record(v);
      if (!item || typeof item.name !== "string") return [];
      return [{ name: item.name, version: str(item.version), tier: str(item.riskTier), score: typeof item.totalScore === "number" || typeof item.totalScore === "string" ? String(item.totalScore) : null, url: str(item.url), date: str(item.scoreComputedAt) }];
    });
  });
};
export const reviewsOf = (cell: CoverageCell) => {
  const reviews = cell.raw?.reviews;
  if (!Array.isArray(reviews)) return [];
  return reviews.flatMap((v) => { const item = record(v); return item && typeof item.slug === "string" ? [{ slug: item.slug, chain: str(item.chain), url: str(item.sourceUrl) }] : []; });
};
export const findingsOf = (cell: CoverageCell) => {
  const findings = cell.raw?.keyFindings;
  if (!Array.isArray(findings)) return [];
  return findings.flatMap((v) => { const item = record(v); return item && typeof item.title === "string" ? [{ title: item.title, severity: str(item.severity), description: str(item.description) }] : []; });
};
export const safeUrl = (value?: string | null) => {
  if (!value) return undefined;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
};
