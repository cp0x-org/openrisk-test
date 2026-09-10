# OpenRisk Project Charter

**Status:** binding for this repository  
**License:** AGPL-3.0-only  
**Scope:** Ethereum mainnet (v1)

## Mission

OpenRisk is a neutral, open-source aggregator of DeFi risk-feed assessments. It places existing provider assessments side by side — verbatim — without synthesizing a composite score.

## Non-negotiables

1. **No proprietary scoring.** OpenRisk must not invent, weight, or blend feed assessments into an OpenRisk risk score or ranking of protocols.
2. **Verbatim display.** Provider assessments are shown as published (or clearly marked as curated excerpts with source links), never editorially restated as OpenRisk’s own judgment.
3. **Gaps are data.** Missing coverage is rendered explicitly; absence must not be papered over.
4. **Open data layer.** Curated protocol metadata, coverage cells, and collector outputs live in this GitHub repository so the community can inspect and correct them.
5. **Neutrality.** Conflicts of interest with protocols or feeds must be disclosed in `docs/CONFLICTS.md` and kept current.
6. **Future scoring.** Any composite scoring feature requires prior written approval from the Ethereum Foundation (per RFP). Until then it is out of scope.

## Architecture principles

- Collectors are automated, documented, and produce auditable JSON under `data/`.
- The web UI is a thin reader of the open data layer (GitHub Pages).
- Community corrections happen via pull requests against `data/`.

## Long-term curation

The project must retain a named long-term curator before Milestone 2 closeout. Curator responsibilities: merge data PRs, keep DefiLlama slugs current, disclose conflicts, and refuse composite-scoring drift.
