export const isProduction = (): boolean => {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalObj: any = typeof globalThis !== 'undefined' ? globalThis : {}
  if (globalObj?.import?.meta?.env?.PROD === true) {
    return true
  }

  return false
}
