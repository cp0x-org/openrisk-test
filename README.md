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
 npm run collect — 3 stages
        │
        ├── 1. DefiLlama  → data/live/tvl.json
        ├── 2. feeds[]    → data/coverage + data/live/feeds/<id>.json
        └── 3. snapshot   → data/snapshot.json
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
npm run collect          # DefiLlama → feeds → snapshot
npm run dev              # Vite UI at http://localhost:5173
```

Useful scripts:

- `npm run collect` — full 3-stage collect
- `npm run build:snapshot` — rebuild `data/snapshot.json` only
- `npm run build` — snapshot + production web build

### Collect stages

| Stage | What | Writes |
| --- | --- | --- |
| 1. DefiLlama | TVL metrics (not a risk feed) | `data/live/tvl.json` |
| 2. Feeds | Auto-discover `collectors/src/feeds/*.ts` → validate → `run()` → persist | `data/coverage/*`, `data/live/feeds/`, `data/feeds.json` |
| 3. Snapshot | UI assembly | `data/snapshot.json` |

Toggle DefiLlama / snapshot in `collectors/config/collectors.json`.  
New risk feeds = one file under `collectors/src/feeds/` (see [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)).

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
