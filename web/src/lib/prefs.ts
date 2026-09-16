/** Small view preferences that survive a reload — stored in a cookie, never sent anywhere. */
const COOKIE = "openrisk_hidden_sources";
const MAX_AGE = 60 * 60 * 24 * 365;

/** Sources the visitor switched off. Storing the hidden set keeps "everything" the default, including feeds added later. */
export const readHiddenSources = (): string[] => {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
    return match ? decodeURIComponent(match[1]).split(",").filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const writeHiddenSources = (ids: string[]): void => {
  try {
    document.cookie = `${COOKIE}=${encodeURIComponent(ids.join(","))}; path=${import.meta.env.BASE_URL}; max-age=${MAX_AGE}; samesite=lax`;
  } catch {
    /* cookies unavailable (private mode, file://) — selection simply resets next visit */
  }
};
