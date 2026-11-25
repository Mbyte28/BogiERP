/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API. Por defecto se usa /api (proxy de Nginx o Vite). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
