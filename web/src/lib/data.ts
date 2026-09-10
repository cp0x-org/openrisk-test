import type { CoverageCell, Protocol, Snapshot } from "./types";

export const fmtUsd = (v: number | null | undefined): string | null => {
  if (v == null) return null;
  if (v >= 1e9) return `${parseFloat((v / 1e9).toFixed(2))}B`;
  if (v >= 1e6) return `${parseFloat((v / 1e6).toFixed(1))}M`;
  return `${(v / 1e3).toFixed(0)}K`;
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

export const asOfLabel = (asOf?: string | null): string => {
  if (!asOf) return "—";
  if (asOf === "live") return "live data";
  return `as of ${asOf}`;
};
