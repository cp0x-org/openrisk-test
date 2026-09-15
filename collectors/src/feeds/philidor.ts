import { listProtocolIds, readJson } from "../paths.ts";
import type { CoverageStatus, Facet, Protocol } from "../paths.ts";
import type { FeedAssessment, FeedModule, FeedRunResult } from "./types.ts";

/**
 * Philidor Analytics — public vault risk scores, no API key.
 * API: https://api.philidor.io/v1 (OpenAPI: /v1/openapi.json)
 *
 * Philidor scores individual vaults (0–10, tiers Prime / Core / Edge) and
 * publishes no protocol-level score. A cell quotes the published tier + score
 * of the largest Ethereum vaults per family — never aggregated.
 *
 * Anonymous access: 10 requests / 60 s per IP (fixed window), page size ≤ 100.
 */

const API_BASE = "https://api.philidor.io/v1";
const SITE_BASE = "https://analytics.philidor.io";
const CHAIN = { name: "Ethereum", slug: "ethereum" } as const;
/** Largest vaults (by TVL) quoted per family. */
const VAULTS_PER_FAMILY = 3;
const MAX_RETRIES = 3;

type ProtocolMapping = {
  philidorId: string;
  /** `families` entry in data/protocols/<id>.json → Philidor `protocol_version` values */
  families: Record<string, string[]>;
};

/** OpenRisk protocolId → Philidor protocol. Families not listed here count as not rated. */
const PROTOCOL_MAP: Record<string, ProtocolMapping> = {
  aave: { philidorId: "aave", families: { v3: ["v3"], v4: ["v4"] } },
  compound: { philidorId: "compound", families: { v3: ["v3"] } },
  // Philidor "morpho" = curated vaults (MetaMorpho V1 + Vault V2), not Morpho Blue markets
  morphovaults: { philidorId: "morpho", families: { MetaMorpho: ["v1", "v2"] } },
  spark: { philidorId: "spark", families: { SparkLend: ["v1"], sUSDS: ["v2"] } },
  uniswap: { philidorId: "uniswap", families: { v3: ["v3"], v4: ["v4"] } },
  yearn: { philidorId: "yearn", families: { v3: ["v3"] } },
};

/** Context for correctors on why a seed protocol has no Philidor cell. */
const GAP_NOTES: Record<string, string> = {
  morpho:
    "Philidor 'morpho' scores curated vaults (mapped to morphovaults); Morpho Blue markets are not scored",
};

type Vault = {
  id: string;
  address: string;
  name: string;
  protocol_version: string | null;
  tvl_usd: number | string | null;
  total_score: number | string | null;
  risk_tier: "Prime" | "Core" | "Edge" | null;
  is_shutdown?: boolean;
  curator_name?: string | null;
  score_computed_at?: string | null;
  last_synced_at?: string | null;
};

type VaultList = { data: Vault[]; meta?: { total?: number } };
type ProtocolList = { data: Array<{ id: string; name: string }> };

type FamilyResult = {
  family: string;
  versions: string[];
  /** Ethereum vaults Philidor lists for this family (`meta.total`) */
  listed: number;
  /** Largest rated vaults by TVL */
  vaults: Vault[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until the fixed rate window resets (`Retry-After` or `X-RateLimit-Reset`, unix seconds). */
const windowWaitMs = (res: Response): number => {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  const ms = Number.isFinite(reset) && reset > 0 ? reset * 1000 - Date.now() + 1000 : 60_000;
  return Math.min(Math.max(ms, 1000), 61_000);
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const url = `${API_BASE}${path}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "openrisk-philidor-collector",
      },
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = windowWaitMs(res);
      await res.body?.cancel();
      console.log(`[philidor] rate limited — waiting ${Math.ceil(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    const body = (await res.json()) as T;
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      const wait = windowWaitMs(res);
      console.log(`[philidor] rate window used up — waiting ${Math.ceil(wait / 1000)}s`);
      await sleep(wait);
    }
    return body;
  }
};

const fetchFamily = async (
  philidorId: string,
  family: string,
  versions: string[],
): Promise<FamilyResult> => {
  let listed = 0;
  const vaults: Vault[] = [];
  for (const version of versions) {
    const qs = new URLSearchParams({
      protocol: philidorId,
      protocol_version: version,
      chain: CHAIN.name,
      limit: String(VAULTS_PER_FAMILY),
      sortBy: "tvl_usd",
      sortOrder: "desc",
    });
    const page = await fetchJson<VaultList>(`/vaults?${qs}`);
    listed += page.meta?.total ?? page.data.length;
    vaults.push(...page.data);
  }
  const rated = vaults
    .filter((v) => v.risk_tier && !v.is_shutdown)
    .sort((a, b) => Number(b.tvl_usd ?? 0) - Number(a.tvl_usd ?? 0))
    .slice(0, VAULTS_PER_FAMILY);
  return { family, versions, listed, vaults: rated };
};

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const vaultUrl = (v: Vault): string => `${SITE_BASE}/vault/${CHAIN.slug}/${v.address}`;

const gap = (raw: Record<string, unknown>): FeedAssessment => ({
  status: "n",
  label: null,
  verbatim: null,
  asOf: null,
  sourceUrl: null,
  facets: [],
  raw,
});

/** One line per vault, Philidor fields only: `[version] name (curator): tier score`. */
const toVerbatimLine = (v: Vault): string => {
  const curator = v.curator_name ? ` (${v.curator_name})` : "";
  const verdict = [v.risk_tier, v.total_score].filter((x) => x != null).join(" ");
  return `[${v.protocol_version ?? "?"}] ${v.name}${curator}: ${verdict}`;
};

const toAssessment = (
  protocol: Protocol,
  philidorId: string,
  results: FamilyResult[],
): FeedAssessment => {
  const rated = results.filter((r) => r.vaults.length > 0);
  if (rated.length === 0) {
    return gap({ philidorId, reason: "no_rated_ethereum_vaults" });
  }

  // Mechanical rule: covered only when every family of the protocol has rated vaults
  const ratedFamilies = new Set(rated.map((r) => r.family));
  const notRated = protocol.families.filter((f) => !ratedFamilies.has(f));
  const status: CoverageStatus = notRated.length === 0 ? "c" : "p";

  const facets: Facet[] = [
    { key: "assessment_unit", label: "Assessment unit", value: "vault", valueType: "enum" },
    ...rated.map(
      (r): Facet => ({
        key: `vaults_${slugify(r.family)}`,
        label: `${r.family} vaults (${CHAIN.name})`,
        value: String(r.listed),
        valueType: "count",
      }),
    ),
  ];
  if (notRated.length) {
    facets.push({
      key: "families_without_vaults",
      label: "No Philidor vaults",
      value: notRated.join(", "),
      valueType: "text",
    });
  }

  const stamps = rated
    .flatMap((r) => r.vaults.map((v) => v.score_computed_at ?? v.last_synced_at ?? ""))
    .filter(Boolean)
    .sort();
  const listedTotal = rated.reduce((n, r) => n + r.listed, 0);

  return {
    status,
    label: `${listedTotal} ${CHAIN.name} vaults`,
    verbatim: rated.flatMap((r) => r.vaults.map(toVerbatimLine)).join("\n"),
    asOf: stamps.at(-1)?.slice(0, 10) ?? null,
    sourceUrl: `${SITE_BASE}/protocols/${philidorId}`,
    facets,
    raw: {
      philidorId,
      chain: CHAIN.slug,
      notRated,
      families: results.map((r) => ({
        family: r.family,
        versions: r.versions,
        listed: r.listed,
        vaults: r.vaults.map((v) => ({
          id: v.id,
          name: v.name,
          version: v.protocol_version,
          curator: v.curator_name ?? null,
          riskTier: v.risk_tier,
          totalScore: v.total_score,
          tvlUsd: v.tvl_usd,
          scoreComputedAt: v.score_computed_at ?? null,
          url: vaultUrl(v),
        })),
      })),
    },
  };
};

const run = async (): Promise<FeedRunResult> => {
  const protocols: Record<string, FeedAssessment> = {};

  console.log(`[philidor] source ${API_BASE} (chain ${CHAIN.name})`);

  const listed = await fetchJson<ProtocolList>("/protocols");
  const listedIds = new Set(listed.data.map((p) => p.id));
  const mappedIds = new Set(Object.values(PROTOCOL_MAP).map((m) => m.philidorId));
  const unmapped = [...listedIds].filter((id) => !mappedIds.has(id));
  if (unmapped.length) {
    console.log(`[philidor] Philidor protocols without an OpenRisk mapping: ${unmapped.join(", ")}`);
  }

  for (const protocolId of listProtocolIds()) {
    const mapping = PROTOCOL_MAP[protocolId];
    if (!mapping) {
      console.log(`[philidor] ${protocolId}: no mapping → gap`);
      protocols[protocolId] = gap({ reason: "no_mapping", note: GAP_NOTES[protocolId] });
      continue;
    }
    if (!listedIds.has(mapping.philidorId)) {
      console.warn(`[philidor] ${protocolId}: "${mapping.philidorId}" not in /v1/protocols`);
    }

    const protocol = readJson<Protocol>(`data/protocols/${protocolId}.json`);
    const results: FamilyResult[] = [];
    for (const [family, versions] of Object.entries(mapping.families)) {
      if (!protocol.families.includes(family)) {
        console.warn(`[philidor] ${protocolId}: mapped family "${family}" not in protocol families`);
      }
      results.push(await fetchFamily(mapping.philidorId, family, versions));
    }

    const assessment = toAssessment(protocol, mapping.philidorId, results);
    console.log(
      `[philidor] ${protocolId}: ${mapping.philidorId} → ${assessment.status} ${assessment.label ?? ""}`,
    );
    protocols[protocolId] = assessment;
  }

  return { protocols };
};

export const feed: FeedModule = {
  id: "philidor",
  name: "Philidor Analytics",
  description:
    "Vault-level risk scores (0–10; Prime / Core / Edge) across asset, platform, control, and history vectors — no protocol-level score. Powered by Philidor · api.philidor.io",
  type: "rating",
  typeLabel: "R",
  url: "https://analytics.philidor.io",
  methodologyUrl: "https://docs.philidor.io/docs/methodology",
  enabled: true,
  collectionMethod: "api",
  run,
};

export default feed;
