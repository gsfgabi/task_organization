/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCK: string
}

declare module '*?url' {
  const src: string
  export default src
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
