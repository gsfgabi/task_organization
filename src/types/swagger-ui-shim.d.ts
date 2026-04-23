declare module 'swagger-ui-dist/swagger-ui-es-bundle.js' {
  interface SwaggerUIBundleCtor {
    (config: unknown): unknown
    presets: { apis: unknown }
    plugins: { DownloadUrl: unknown }
  }
  const SwaggerUIBundle: SwaggerUIBundleCtor
  export default SwaggerUIBundle
}

declare module 'swagger-ui-dist/swagger-ui-standalone-preset.js' {
  const SwaggerUIStandalonePreset: unknown
  export default SwaggerUIStandalonePreset
}
