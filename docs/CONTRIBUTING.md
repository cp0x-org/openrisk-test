# Contributing to OpenRisk

Thank you for helping keep the open data layer accurate.

## What you can change

| Change | Where | Notes |
| --- | --- | --- |
| Fix a coverage cell | `data/coverage/<protocol>.json` | Keep `verbatim` true to source; set `sourceUrl` |
| Fix governance / audits / incidents | `data/protocols/<protocol>.json` | Tag `provenance`: `onchain` \| `verified` \| `docs` \| `selfrep` |
| Add a protocol | `data/protocols/` + empty coverage stub | Add DefiLlama slug/parent fields |
| **Add a risk feed** | `collectors/src/feeds/<id>.ts` only | See below — OpenRisk validates + writes JSON |
| Collector / orchestrator | `collectors/src/` (outside `feeds/`) | Maintainers |

## Adding a risk feed (PR-friendly)

1. Copy `collectors/src/feeds/_template.ts` → `collectors/src/feeds/<id>.ts`
2. Filename **must** equal `feed.id` (e.g. `llamarisk.ts` → `id: "llamarisk"`)
3. Fill metadata: `name`, `description`, `type`, `url`, `methodologyUrl`
4. Implement `run()` that **returns** `{ protocols: { [protocolId]: assessment } }`
5. **Do not** write files, push git, or edit `data/` — the orchestrator persists after schema checks
6. Locally: `npm run collect` then open a PR with only your `feeds/<id>.ts` (plus docs if needed)

Required assessment fields: `status` (`c` \| `p` \| `n`). For covered/partial prefer `label`, `verbatim`, `sourceUrl`, `asOf`.

Skipped automatically: files starting with `_`, and `types.ts` (shared contract, not a feed).

## Process (data fixes)

1. Open an issue (optional for tiny typos).
2. Fork and branch from `main`.
3. Edit the relevant files.
4. Run `npm install` && `npm run collect` (or `npm run build:snapshot` for UI-only rebuild).
5. Open a PR. Reference source URLs in the body.

## What we will not merge

- Composite / OpenRisk-owned risk scores
- Editorial paraphrases presented as feed assessments
- Feed modules that write to disk or bypass validation
- Undisclosed promotional content for a protocol or feed

## License

Contributions are accepted under AGPL-3.0-only.
