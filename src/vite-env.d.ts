/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Console version baked from package.json at build time (see vite.config.ts). */
declare const __APP_VERSION__: string;
