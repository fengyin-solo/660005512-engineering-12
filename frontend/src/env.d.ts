/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_PORT?: string
  readonly VITE_BACKEND_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.vue" { import type { DefineComponent } from "vue"; const c: DefineComponent<{}, {}, any>; export default c }
