# Deploy OpenRisk to GitHub

This guide takes a local copy of the project to a public GitHub repo with:

1. **Scheduled collectors** that refresh JSON under `data/` and commit back to the repo  
2. **GitHub Pages** that hosts the React UI reading that open data layer  

No paid infra is required. No custom API keys are required for DefiLlama or DeFiScan.

---

## What happens after deploy

```
Every 6 hours (UTC) ──► workflow "Collect data"
                              │
                              ├─ npm run collect
                              │     DefiLlama → data/live/tvl.json
                              │     DeFiScan  → data/coverage/*/assessments.defiscan
                              │                 + data/live/feeds/defiscan.json
                              │     snapshot  → data/snapshot.json
                              │
                              └─ git commit + push (if anything changed)
                                        │
                                        ▼
                              push to main ──► workflow "Deploy GitHub Pages"
                                        │
                                        └─ build web/ → publish site
                                           https://<user>.github.io/<repo>/
```

Manual overrides:

- **Actions → Collect data → Run workflow** — refresh data now  
- **Actions → Deploy GitHub Pages → Run workflow** — rebuild the site now  

---

## 0. Prerequisites

- GitHub account  
- Git + Node.js 20+ locally  
- `gh` CLI optional (convenient for creating the repo)

---

## 1. Create the GitHub repository

### Option A — GitHub website

1. Open [https://github.com/new](https://github.com/new)  
2. Name the repo (example: `openrisk`)  
3. Set visibility to **Public** (required for free GitHub Pages on user/org accounts in the usual setup, and matches the AGPL / public-good goal)  
4. **Do not** add a README / license / `.gitignore` on GitHub — this project already has them  
5. Create the repository  

### Option B — GitHub CLI

```bash
cd /path/to/cp0x_risk
gh repo create openrisk --public --source=. --remote=origin
```

(If the folder is not a git repo yet, init first — see step 2.)

---

## 2. First push from your machine

In the project root:

```bash
git init
git add .
git commit -m "chore: initial OpenRisk scaffold"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<REPO>.git
git push -u origin main
```

Replace `<YOUR_USER>` / `<REPO>` with your values.

If `npm` was never run, generate a lockfile before the first Actions run:

```bash
npm install
git add package-lock.json
git commit -m "chore: add package-lock for CI"
git push
```

CI uses `npm ci`, which **requires** `package-lock.json` in the repo.

---

## 3. Enable Actions permissions (needed for bot commits)

Collectors commit updated JSON **from inside GitHub Actions**.

### Preferred: built-in `GITHUB_TOKEN`

1. Open the **repository** (not your account):  
   `https://github.com/<USER>/<REPO>/settings/actions`
2. Scroll to **Workflow permissions**
3. Choose **Read and write permissions** → Save

No Personal Access Token is needed.

### If that control is missing / greyed out

Common causes:

| Cause | What to do |
| --- | --- |
| You are in **Account** or **Org** settings, not the repo | Use the repo URL above (`…/<REPO>/settings/actions`) |
| You are not an **Admin** of the repo | Ask the owner for Admin, or use the PAT workaround below |
| Repo is under an **Organization** that locks the setting | Org owner must allow write tokens, **or** use PAT below |
| Actions are disabled | Same page → enable Actions for this repository |

Org lock (typical): org → **Settings → Actions → General → Workflow permissions** is set to “Read repository contents and packages permissions” and “Enforce” is on. Only an org owner can change that.

### Workaround: Personal Access Token (when UI is locked)

1. Create a fine-grained PAT (recommended) or classic PAT:
   - Fine-grained: Resource owner = your user/org, Repository access = this repo only  
     Permissions → **Contents: Read and write**  
     (and **Metadata: Read** — automatic)
   - Classic: scope `repo`
2. Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `DATA_PUSH_TOKEN`
   - Value: the PAT
3. Keep `.github/workflows/collect.yml` as in this repo — checkout already uses  
   `secrets.DATA_PUSH_TOKEN` when set, otherwise `github.token`.

Push the workflow change, then run **Collect data** once.

### If `main` is branch-protected

If you require PR reviews on `main`, the bot `git push` in `collect.yml` will fail. Options:

- Allow the actor (github-actions bot or the PAT user) to bypass in rulesets, **or**  
- Keep `main` unprotected until Milestone 1 is stable  

---

## 4. Enable GitHub Pages

1. Repo → **Settings → Pages**  
2. **Build and deployment → Source**: **GitHub Actions**  
3. Do **not** pick “Deploy from a branch” — `pages.yml` uploads an artifact  

First successful run of **Deploy GitHub Pages** publishes:

```text
https://<YOUR_USER>.github.io/<REPO>/
```

The Vite base path is set automatically to `/<REPO>/` in CI (`VITE_BASE`).  
If you later use a custom domain or a user-site repo (`<user>.github.io`), set `VITE_BASE=/` accordingly in `.github/workflows/pages.yml`.

---

## 5. How the schedule works

File: `.github/workflows/collect.yml`

```yaml
on:
  schedule:
    - cron: "0 */6 * * *"   # 00:00, 06:00, 12:00, 18:00 UTC
  workflow_dispatch:          # manual button in the Actions UI
  push:
    paths:                    # also runs when configs/data inputs change
      - "data/protocols/**"
      - "data/coverage/**"
      - "data/feeds.json"
      - "collectors/**"
```

Important GitHub quirks:

| Topic | Behavior |
| --- | --- |
| Timezone | Cron is always **UTC** |
| Default branch only | Scheduled jobs run only on the repo **default** branch (`main`) |
| Idle public repos | On free plans, schedules can be **paused** after ~60 days of no repo activity; a push or manual run wakes them |
| Delay | Cron is best-effort; jobs may start a few minutes late |
| Secrets | None required today; DefiLlama + DeFiScan GitHub raw files are public |

After a successful collect with changes, Actions commits something like:

```text
chore(data): refresh live metrics and feed assessments
```

author: `openrisk-bot` / `github-actions[bot]`.

That push then triggers **Deploy GitHub Pages**, so the site picks up new TVL / DeFiScan cells.

---

## 6. Verify everything once

### Collectors

1. **Actions → Collect data → Run workflow**  
2. Wait for green  
3. Check that a new commit appeared (or the log says `No data changes`)  
4. Inspect `data/live/tvl.json`, `data/live/feeds/defiscan.json`, `data/snapshot.json`  

### Site

1. **Actions → Deploy GitHub Pages** should run after the data commit (or run it manually)  
2. Open `https://<YOUR_USER>.github.io/<REPO>/`  
3. Matrix should load; protocol pages should show DeFiScan facets where mapped  

### Local sanity check (optional)

```bash
npm install
npm run collect
npm run dev
```

---

## 7. Day-to-day operations

| Task | How |
| --- | --- |
| Force a data refresh | Actions → Collect data → Run workflow |
| Change collect interval | Edit cron in `.github/workflows/collect.yml` |
| Add a DeFiScan mapping | Edit `collectors/config/feeds/defiscan.json`, push |
| Fix coverage by hand | PR against `data/coverage/<protocol>.json` (see `docs/CONTRIBUTING.md`) |
| Disable a collector | Set `"enabled": false` in `collectors/config/collectors.json` |
| Rename the GitHub repo | Update nothing in code if you keep using `VITE_BASE: /${{ github.event.repository.name }}/` — it follows the new name on next Pages build |

---

## 8. Security / privacy notes

- Workflows use `permissions:` least privilege per file (`contents: write` for collect; `pages: write` + `id-token: write` for Pages).  
- Do not commit `.env` secrets; none are required for current collectors.  
- If you later add a private feed API, store the key in **Settings → Secrets and variables → Actions** and reference it as `${{ secrets.NAME }}` — never in JSON under `data/`.  

---

## 9. Checklist

- [ ] Public GitHub repo created  
- [ ] `git push` of full project including `package-lock.json`  
- [ ] Actions → General → **Read and write** workflow permissions  
- [ ] Pages → Source = **GitHub Actions**  
- [ ] Manual **Collect data** succeeded  
- [ ] Manual or automatic **Deploy GitHub Pages** succeeded  
- [ ] Site opens and matrix renders  
- [ ] (Later) fill `docs/CONFLICTS.md` and name a long-term curator in `CHARTER.md`  

---

## Related docs

- [`README.md`](../README.md) — project overview  
- [`docs/DATA_SCHEMA.md`](./DATA_SCHEMA.md) — universal assessment JSON  
- [`docs/CONTRIBUTING.md`](./CONTRIBUTING.md) — community data PRs  
- [`CHARTER.md`](../CHARTER.md) — no composite scoring rule  
