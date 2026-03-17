/**
 * @since 1.0.0
 */

export interface QuickJSRuntime {
  executeCode(code: string, filename?: string): Promise<unknown>
  dispose(): void
}

export interface QuickJSRuntimeOptions {
  enableModuleLoader?: boolean
  moduleBasePath?: string
}
