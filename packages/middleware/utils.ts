/**
 * Detect if running in production environment
 * This tries multiple common patterns for detecting production
 */
export const isProduction = (): boolean => {
  // Check for common environment variables
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true
  }

  // Safe check for Vite's import.meta.env (for ESM only)
  // This will be handled by tsup define replacements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalObj: any = typeof globalThis !== 'undefined' ? globalThis : {}
  if (globalObj?.import?.meta?.env?.PROD === true) {
    return true
  }

  return false
}
