import { listProtocolIds } from "../paths.ts";
import type { Facet } from "../paths.ts";
import type { FeedAssessment, FeedModule, FeedRunResult } from "./types.ts";

/**
 * Risklayer Beta — public protocol risk scores + dimension breakdown.
 * API: https://risklayer.online/api/protocols[/{domain}]
 */

const API_BASE = "https://risklayer.online/api";
const SITE_BASE = "https://risklayer.online/protocol";

/** OpenRisk protocolId → Risklayer domain slug */
const PROTOCOL_MAP: Record<string, string> = {
  aave: "aave.com",
  compound: "compound.finance",
  curve: "curve.fi",
  lido: "lido.fi",
  morpho: "morpho.org",
  pendle: "pendle.finance",
  rocketpool: "rocketpool.net",
  spark: "spark.fi",
  uniswap: "uniswap.org",
};

type Dimension = {
  name: string;
  score: number;
  weight?: number;
};

type KeyFinding = {
  title?: string;
  severity?: string;
  detail?: string;
  description?: string;
};

type ProtocolDetail = {
  domain: string;
  name?: string;
  lastAnalyzedAt?: string | null;
  overallScore?: number | null;
  riskLevel?: string | null;
  dimensions?: Dimension[];
  latestAnalysis?: {
    overallScore?: number | null;
    riskLevel?: string | null;
    status?: string;
    runNumber?: number;
    createdAt?: string;
    dimensions?: Dimension[];
    keyFindings?: KeyFinding[];
  } | null;
};

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const formatScore = (score: number | null | undefined): string | null => {
  if (score == null || Number.isNaN(Number(score))) return null;
  return Number(score).toFixed(1);
};

const toFacets = (
  score: number | null | undefined,
  riskLevel: string | null | undefined,
  dimensions: Dimension[],
): Facet[] => {
  const facets: Facet[] = [];
  const scoreLabel = formatScore(score);
  if (scoreLabel != null) {
    facets.push({
      key: "overall_score",
      label: "Overall score",
      value: scoreLabel,
      valueType: "score",
      scale: "0-10",
    });
  }
  if (riskLevel) {
    facets.push({
      key: "risk_level",
      label: "Risk level",
      value: riskLevel,
      valueType: "enum",
    });
  }
  for (const dim of dimensions) {
    const dimScore = formatScore(dim.score);
    if (dimScore == null) continue;
    facets.push({
      key: slugify(dim.name) || "dimension",
      label: dim.name,
      value: dimScore,
      valueType: "score",
      scale: "0-10",
    });
  }
  return facets;
};

const toVerbatim = (
  score: number | null | undefined,
  riskLevel: string | null | undefined,
  findings: KeyFinding[],
): string => {
  const headerParts = [
    formatScore(score) != null ? `overallScore=${formatScore(score)}` : null,
    riskLevel ? `riskLevel=${riskLevel}` : null,
  ].filter(Boolean);
  const header = headerParts.join("; ");

  const lines = findings
    .slice(0, 8)
    .map((f) => {
      const title = (f.title || "").trim();
      if (!title) return null;
      const sev = (f.severity || "").trim();
      return sev ? `[${sev}] ${title}` : title;
    })
    .filter((x): x is string => Boolean(x));

  if (lines.length === 0) return header || "Risklayer Beta assessment";
  return header ? `${header}\n${lines.join("\n")}` : lines.join("\n");
};

const toAssessment = (detail: ProtocolDetail | null, domain: string | null): FeedAssessment => {
  if (!detail || !domain) {
    return {
      status: "n",
      label: null,
      verbatim: null,
      asOf: null,
      sourceUrl: null,
      facets: [],
      raw: { reason: domain ? "no_analysis" : "no_mapping" },
    };
  }

  const analysis = detail.latestAnalysis;
  const score = detail.overallScore ?? analysis?.overallScore ?? null;
  const riskLevel = detail.riskLevel ?? analysis?.riskLevel ?? null;
  const dimensions = detail.dimensions ?? analysis?.dimensions ?? [];
  const findings = analysis?.keyFindings ?? [];
  const asOf =
    (detail.lastAnalyzedAt || analysis?.createdAt || "").slice(0, 10) || null;
  const scoreLabel = formatScore(score);
  const label =
    scoreLabel != null && riskLevel
      ? `${scoreLabel} · ${riskLevel}`
      : scoreLabel ?? riskLevel ?? null;

  if (score == null && !riskLevel) {
    return {
      status: "n",
      label: null,
      verbatim: null,
      asOf,
      sourceUrl: `${SITE_BASE}/${domain}`,
      facets: [],
      raw: { domain, reason: "empty_score" },
    };
  }

  return {
    status: "c",
    label,
    verbatim: toVerbatim(score, riskLevel, findings),
    asOf,
    sourceUrl: `${SITE_BASE}/${domain}`,
    facets: toFacets(score, riskLevel, dimensions),
    raw: {
      domain,
      overallScore: score,
      riskLevel,
      runNumber: analysis?.runNumber ?? null,
      dimensions,
      keyFindings: findings.slice(0, 12),
    },
  };
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "openrisk-risklayer-collector",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return (await res.json()) as T;
};

const run = async (): Promise<FeedRunResult> => {
  const protocols: Record<string, FeedAssessment> = {};

  console.log(`[risklayer] source ${API_BASE}/protocols`);

  for (const protocolId of listProtocolIds()) {
    const domain = PROTOCOL_MAP[protocolId] ?? null;
    if (!domain) {
      console.log(`[risklayer] ${protocolId}: no mapping → gap`);
      protocols[protocolId] = toAssessment(null, null);
      continue;
    }

    const detail = await fetchJson<ProtocolDetail>(
      `${API_BASE}/protocols/${encodeURIComponent(domain)}`,
    );
    if (!detail) {
      console.warn(`[risklayer] ${protocolId}: missing ${domain}`);
      protocols[protocolId] = toAssessment(null, domain);
      continue;
    }

    const assessment = toAssessment(detail, domain);
    console.log(
      `[risklayer] ${protocolId}: ${domain} → ${assessment.label ?? "gap"}`,
    );
    protocols[protocolId] = assessment;
  }

  return { protocols };
};

export const feed: FeedModule = {
  id: "risklayer",
  name: "Risklayer",
  description:
    "Beta AI + quantitative protocol risk scores across dependency, governance, tokenomics, audit, and smart-contract dimensions",
  type: "rating",
  typeLabel: "R",
  url: "https://risklayer.online",
  methodologyUrl: "https://risklayer.online/",
  enabled: true,
  collectionMethod: "api",
  run,
};

export default feed;
