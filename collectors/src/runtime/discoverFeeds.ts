import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { FeedModule } from "../feeds/types.ts";

/** Community feed modules live here — not this runtime folder. */
const feedsDir = join(dirname(fileURLToPath(import.meta.url)), "../feeds");

/** Only non-feed helpers allowed inside feeds/ (authors may import types). */
const SKIP = new Set(["types.ts"]);

const isFeedFile = (name: string): boolean =>
  name.endsWith(".ts") && !name.startsWith("_") && !SKIP.has(name);

const asFeedModule = (raw: unknown, file: string): FeedModule | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const candidate = (obj.default ?? obj.feed) as Record<string, unknown> | undefined;
  if (!candidate || typeof candidate !== "object") return null;

  const required = [
    "id",
    "name",
    "description",
    "type",
    "typeLabel",
    "url",
    "methodologyUrl",
    "run",
  ] as const;
  for (const key of required) {
    if (!(key in candidate)) {
      console.warn(`[feeds] ${file}: missing "${key}" — skip`);
      return null;
    }
  }
  if (typeof candidate.run !== "function") {
    console.warn(`[feeds] ${file}: "run" must be a function — skip`);
    return null;
  }
  if (typeof candidate.id !== "string" || !candidate.id) {
    console.warn(`[feeds] ${file}: "id" must be a non-empty string — skip`);
    return null;
  }

  const expectedId = file.replace(/\.ts$/, "");
  if (candidate.id !== expectedId) {
    console.warn(
      `[feeds] ${file}: id "${candidate.id}" must match filename "${expectedId}" — skip`,
    );
    return null;
  }

  return candidate as unknown as FeedModule;
};

/** Scan collectors/src/feeds/*.ts and load valid FeedModule exports. */
export const discoverFeeds = async (): Promise<FeedModule[]> => {
  const files = readdirSync(feedsDir).filter(isFeedFile).sort();
  const feeds: FeedModule[] = [];

  for (const file of files) {
    const url = pathToFileURL(join(feedsDir, file)).href;
    try {
      const mod = await import(url);
      const feed = asFeedModule(mod, file);
      if (!feed) continue;
      if (feed.enabled === false) {
        console.log(`[feeds] ${feed.id}: disabled — skip`);
        continue;
      }
      feeds.push(feed);
      console.log(`[feeds] discovered ${feed.id} (${feed.name})`);
    } catch (err) {
      console.warn(`[feeds] failed to load ${file}:`, err);
    }
  }

  return feeds;
};
