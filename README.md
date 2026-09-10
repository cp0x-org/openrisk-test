# OpenRisk

Neutral DeFi risk intelligence aggregator for Ethereum mainnet.

OpenRisk shows what independent risk feeds say about major DeFi protocols — **side by side, verbatim, with coverage gaps visible**. It does **not** produce a composite OpenRisk score.

Design reference: `1/openrisk-mockup.html` (EF App Relations RFP concept).  
Charter: [`CHARTER.md`](./CHARTER.md).

## Repository layout

```
data/                 # open data layer (community-correctable)
  feeds.json
  protocols/*.json
  coverage/*.json
  live/tvl.json       # written by collectors
  snapshot.json       # assembled for the UI
collectors/           # scheduled collectors (TypeScript)
web/                  # React + TypeScript UI (GitHub Pages)
.github/workflows/    # collect on cron + deploy Pages
```

## Pipeline

```
GitHub Actions (cron)
        │
        ▼
 collectors (read collectors/config + data/protocols)
        │
        ├── DefiLlama → data/live/tvl.json
        └── snapshot  → data/snapshot.json
        │
        ▼
  commit + push to GitHub
        │
        ▼
  GitHub Pages serves React app
  which fetches /data/snapshot.json
```

## Local development

```bash
npm install
npm run collect          # live TVL + snapshot
npm run dev              # Vite UI at http://localhost:5173
```

Useful scripts:

- `npm run collect` — DefiLlama TVL + DeFiScan coverage + snapshot
- `npm run build:snapshot` — rebuild `data/snapshot.json` without hitting DefiLlama
- `npm run build` — snapshot + production web build

### Feed collectors

| Collector | Source | Writes |
| --- | --- | --- |
| `defillama` | DefiLlama API | `data/live/tvl.json` |
| `defiscan` | GitHub `deficollective/defiscan` reviews | `data/live/feeds/defiscan.json` + `data/coverage/*/assessments.defiscan` |

Universal assessment shape: [`docs/DATA_SCHEMA.md`](./docs/DATA_SCHEMA.md).

## GitHub Pages

Full step-by-step (repo creation, Actions write permissions, cron, Pages):  
**[`docs/DEPLOY.md`](./docs/DEPLOY.md)**.

Short version:

1. Push to `main` (include `package-lock.json`).
2. Settings → Actions → General → **Read and write** workflow permissions.
3. Settings → Pages → Source: **GitHub Actions**.
4. Run **Collect data** once from the Actions tab, then confirm the site URL.

## License

AGPL-3.0-only — see [`LICENSE`](./LICENSE).
