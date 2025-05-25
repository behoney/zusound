const getIsProduction = (): boolean => {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true
  }

  const globalObj = typeof globalThis !== 'undefined' ? globalThis : {}
  if (globalObj['import']?.meta?.env?.PROD === true) {
    return true
  }

  return false
}

export const isProduction = getIsProduction()
