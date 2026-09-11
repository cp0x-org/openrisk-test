# OpenRisk data schema

Universal shapes for the open data layer. Collectors **normalize** feed-native
payloads into these types so the UI and community PRs stay feed-agnostic.

## Principles (from RFP / CHARTER)

- No OpenRisk composite score
- Assessments shown **verbatim** (or clearly sourced excerpts)
- Coverage gaps are first-class data: `c` | `p` | `n`
- Every cell links back to a source
- Feed-specific detail lives in optional `facets` + opaque `raw`

## Coverage cell (universal)

Stored in `data/coverage/<protocolId>.json` under `assessments.<feedId>`:

```json
{
  "status": "c",
  "label": "Stage 1",
  "verbatim": "…exact or clearly sourced assessment text…",
  "asOf": "2025-05-21",
  "sourceUrl": "https://www.defiscan.info/protocols/morpho/ethereum",
  "collection": {
    "method": "git",
    "collectedAt": "2026-09-10T00:00:00.000Z",
    "collectorId": "defiscan"
  },
  "facets": [
    {
      "key": "stage",
      "label": "Decentralization stage",
      "value": "1",
      "valueType": "stage",
      "scale": "0-2"
    },
    {
      "key": "upgradeability",
      "label": "Upgradeability",
      "value": "M",
      "valueType": "enum",
      "scale": "L|M|H"
    }
  ],
  "raw": {}
}
```

| Field | Required | Purpose |
| --- | --- | --- |
| `status` | yes | `c` covered · `p` partial · `n` not covered |
| `label` | for `c`/`p` | Short matrix cell text |
| `verbatim` | for `c`/`p` | Card / popover body — never an OpenRisk paraphrase |
| `asOf` | recommended | ISO date, `YYYY-MM`, or `live` |
| `sourceUrl` | recommended | Canonical page on the feed |
| `collection` | when auto | How/when the collector wrote the cell |
| `facets` | optional | Structured dimensions any feed can fill |
| `raw` | optional | Feed-native dump for audit / reprocessing |

### Status rules

- **`c`** — feed publishes a protocol-level (or agreed primary) assessment
- **`p`** — only a subset of the protocol family / markets / vaults is assessed
- **`n`** — no assessment found (gap is intentional data)

### Facets

Facets are a **uniform bag of key/value dimensions**. Different feeds use different keys:

| Feed | Typical facets |
| --- | --- |
| DeFiScan | `stage`, `chain`, `upgradeability`, `autonomy`, `exit_window`, `accessibility` |
| Risklayer | `overall_score`, `risk_level`, plus dimension scores |
| Credora | `credit_rating`, `outlook` |
| LlamaRisk | `report_count`, `latest_title` |
| Live dashboards | `mode=live`, optional metric snapshots |

The UI may render unknown facets as a generic list; it must not invent scores from them.

## Live collector outputs

- `data/live/tvl.json` — DefiLlama metrics
- `data/live/feeds/<feedId>.json` — full collector run (index + per-protocol raw)
- `data/snapshot.json` — assembled UI payload

Manual edits to `data/coverage/` are allowed. Collectors **only overwrite their own** `assessments.<feedId>` key.
