/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESONITE_LINK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
