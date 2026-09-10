# Contributing to OpenRisk

Thank you for helping keep the open data layer accurate.

## What you can change

| Change | Where | Notes |
| --- | --- | --- |
| Fix a coverage cell | `data/coverage/<protocol>.json` | Keep `verbatim` true to source; set `sourceUrl` |
| Fix governance / audits / incidents | `data/protocols/<protocol>.json` | Tag `provenance`: `onchain` \| `verified` \| `docs` \| `selfrep` |
| Add a protocol | `data/protocols/` + `data/coverage/` | Also add DefiLlama slug if available |
| Add a feed | `data/feeds.json` | Require public methodology URL |
| Collector bugfixes | `collectors/` | Prefer deterministic JSON output |

## Process

1. Open an issue describing the correction (optional for tiny typos).
2. Fork and branch from `main`.
3. Edit only the JSON that needs changing.
4. Run locally:
   - `npm install`
   - `npm run build:snapshot`
5. Open a PR. Reference the source URL in the PR body.

## What we will not merge

- Composite / OpenRisk-owned risk scores
- Editorial paraphrases presented as feed assessments
- Undisclosed promotional content for a protocol or feed

## License

Contributions are accepted under AGPL-3.0-only.
