/// <reference types="vite/client" />
declare module "*.vue" { import type { DefineComponent } from "vue"; const c: DefineComponent<{}, {}, any>; export default c }

interface ImportMetaEnv {
  readonly VITE_DEV_PORT: string
  readonly VITE_BACKEND_HOST: string
  readonly VITE_BACKEND_PORT: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
