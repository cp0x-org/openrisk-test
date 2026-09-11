import {
  listProtocolIds,
  readJson,
  writeJson,
  type CollectorsConfig,
  type Protocol,
} from "../paths.ts";

type LlamaProtocol = {
  slug?: string;
  name?: string;
  tvl?: number;
  chainTvls?: Record<string, number>;
  parentProtocol?: string;
};

type LiveTvlFile = {
  version: number;
  source: string;
  updatedAt: string | null;
  note?: string;
  protocols: Record<
    string,
    {
      tvlUsd: number | null;
      ethereumTvlUsd: number | null;
      volume24hUsd: number | null;
      defillamaSlug: string | null;
      defillamaSlugs: string[];
      defillamaParent: string | null;
      tvlWithin: string | null;
      matchedSlugs: string[];
    }
  >;
};

const ethTvl = (p: LlamaProtocol): number =>
  p.chainTvls?.Ethereum ?? p.chainTvls?.ethereum ?? 0;

export const collectDefillama = async (): Promise<void> => {
  const config = readJson<CollectorsConfig>("collectors/config/collectors.json");
  const baseUrl = config.defillama.baseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/protocols`;

  console.log(`[defillama] GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DefiLlama /protocols failed: ${res.status} ${res.statusText}`);
  }

  const list = (await res.json()) as LlamaProtocol[];
  const bySlug = new Map<string, LlamaProtocol>();
  const byParent = new Map<string, LlamaProtocol[]>();

  for (const p of list) {
    if (p.slug) bySlug.set(p.slug.toLowerCase(), p);
    if (p.parentProtocol) {
      const arr = byParent.get(p.parentProtocol) ?? [];
      arr.push(p);
      byParent.set(p.parentProtocol, arr);
    }
  }

  const live: LiveTvlFile = {
    version: 1,
    source: "defillama",
    updatedAt: new Date().toISOString(),
    protocols: {},
  };

  for (const id of listProtocolIds()) {
    const protocol = readJson<Protocol>(`data/protocols/${id}.json`);
    const parent = protocol.defillamaParent ?? null;
    const slugs = [
      ...new Set(
        [
          ...(protocol.defillamaSlugs ?? []),
          ...(protocol.defillamaSlug ? [protocol.defillamaSlug] : []),
        ].map((s) => s.toLowerCase()),
      ),
    ];

    let matched: LlamaProtocol[] = [];
    if (parent && byParent.has(parent)) {
      matched = byParent.get(parent) ?? [];
    } else if (slugs.length > 0) {
      matched = slugs.map((s) => bySlug.get(s)).filter(Boolean) as LlamaProtocol[];
    }

    const ethereumTvlUsd = matched.reduce((sum, p) => sum + ethTvl(p), 0) || null;
    const totalTvl = matched.reduce((sum, p) => sum + (p.tvl ?? 0), 0) || null;
    const tvlUsd =
      protocol.tvlWithin
        ? null
        : config.defillama.preferEthereumTvl && ethereumTvlUsd != null
          ? ethereumTvlUsd
          : totalTvl;

    live.protocols[id] = {
      tvlUsd,
      ethereumTvlUsd,
      volume24hUsd: null,
      defillamaSlug: protocol.defillamaSlug,
      defillamaSlugs: protocol.defillamaSlugs ?? slugs,
      defillamaParent: parent,
      tvlWithin: protocol.tvlWithin,
      matchedSlugs: matched.map((p) => p.slug!).filter(Boolean),
    };

    if (protocol.tvlWithin) {
      console.log(`[defillama] ${id}: tvlWithin=${protocol.tvlWithin}`);
    } else if (matched.length === 0) {
      console.warn(`[defillama] ${id}: no DefiLlama match`);
    } else {
      console.log(
        `[defillama] ${id}: ${matched.length} series · eth=$${Math.round(ethereumTvlUsd ?? 0)} total=$${Math.round(totalTvl ?? 0)}`,
      );
    }
  }

  writeJson("data/live/tvl.json", live);
  console.log("[defillama] wrote data/live/tvl.json");
};
