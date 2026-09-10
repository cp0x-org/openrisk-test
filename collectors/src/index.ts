import { readJson, type CollectorsConfig } from "./paths.ts";
import { collectDefillama } from "./collectors/defillama.ts";
import { collectDefiscan } from "./collectors/defiscan.ts";
import { buildSnapshot } from "./snapshot.ts";

const main = async () => {
  const config = readJson<CollectorsConfig>("collectors/config/collectors.json");
  const enabled = new Set(
    config.collectors.filter((c) => c.enabled).map((c) => c.id),
  );

  console.log("[openrisk] collectors starting");
  console.log("[openrisk] enabled:", [...enabled].join(", ") || "(none)");

  if (enabled.has("defillama")) {
    await collectDefillama();
  }

  if (enabled.has("defiscan")) {
    await collectDefiscan();
  }

  if (enabled.has("snapshot")) {
    buildSnapshot();
  }

  console.log("[openrisk] collectors finished");
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
