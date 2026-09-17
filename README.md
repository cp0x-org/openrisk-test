# OpenRisk

Neutral DeFi risk intelligence aggregator for Ethereum mainnet.

OpenRisk shows what independent risk feeds say about major DeFi protocols — **side by side, verbatim, with coverage gaps visible**. It does **not** produce a composite OpenRisk score.

Design reference: `1/openrisk-mockup.html` (EF App Relations RFP concept).  
Charter: [`CHARTER.md`](./CHARTER.md).

## Repository layout

```
data/                 # open data layer
  protocols/*.json    # curated, in git
  categories.json     # curated, in git
  meta.json           # curated, in git
  feeds.json          # generated — not in git
  coverage/*.json     # generated — not in git
  live/tvl.json       # generated — not in git
  snapshot.json       # generated — not in git
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
        ├──► Actions artifact "openrisk-data"   (transport, 30 days, private)
        └──► release "data-latest"              (public, permanent)
        │
        ▼
  Deploy GitHub Pages (on workflow_run)
        │
        ├── restore data from the artifact (release as fallback)
        ├── npm run build:snapshot
        └── vite build → web/dist
        │
        ▼
  React app loads the release snapshot,
  falling back to the copy bundled in dist
```

Collected data is **not committed**. It leaves each run as an Actions artifact and
as a public release asset:

```
https://github.com/cp0x-org/openrisk-test/releases/download/data-latest/snapshot.json
https://github.com/cp0x-org/openrisk-test/releases/download/data-latest/openrisk-data.tar.gz
```

## Local development

```bash
npm install
npm run collect          # DefiLlama → feeds → snapshot (needs network)
npm run dev              # Vite UI at http://localhost:5173
```

`data/coverage`, `data/live`, `data/feeds.json` and `data/snapshot.json` are not in
git, so a fresh clone has no collected data. Either run `npm run collect`, or pull
the last published bundle:

```bash
npm run data:pull        # gh release download data-latest → data/
```

Without either, `npm run build:snapshot` still succeeds — it just emits a snapshot
with empty TVL and no assessments, and warns about both.

Useful scripts:

- `npm run collect` — full 3-stage collect (network)
- `npm run data:pull` — download the last published data bundle into `data/`
- `npm run build:snapshot` — rebuild `data/feeds.json` + `data/snapshot.json` (offline)
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
