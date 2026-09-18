/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the rolling snapshot.json release asset. Unset locally. */
  readonly VITE_DATA_URL?: string;
}
