/**
 * Detect if running in production environment
 * This tries multiple common patterns for detecting production
 */
export const isProduction = (): boolean => {
  // Check for common environment variables
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true
  }

  // Check for Vite's import.meta.env (will be replaced at build time)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD === true) {
    return true
  }

  return false
}
