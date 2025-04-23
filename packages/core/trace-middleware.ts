// new impl below @apr23 2025

import { SonicChunk } from '../shared-types'

// ------------------------------------------------------------
type TraceMap = Map<string, unknown>

const traceMap: TraceMap = new Map()

type prevState = Record<string, unknown>

const updateTraceMapAndGetPrevState = (entries: [string, unknown][]): prevState => {
  const prevState: prevState = {}
  for (const [key, value] of entries) {
    prevState[key] = value
    traceMap.set(key, value)
  }
  return prevState
}

const traceImpl_new = (options: TraceOptions<T> = {}): SonicChunk => {
  return initializer
}
