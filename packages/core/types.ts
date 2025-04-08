import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TraceData<T> {
  diff: DiffResult
  timestampStart: number
  duration: number
}

export interface TraceOptions<T> {
  onTrace?: (traceData: TraceData<T>) => void
  diffFn?: (prevState: T, nextState: T) => DiffResult
}

export interface DiffResult {
  changes: Record<string, unknown>
  type: 'add' | 'remove' | 'update'
}

export type TraceImpl = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, Mps, Mcs>,
  options?: TraceOptions<T>
) => StateCreator<T, Mps, Mcs>
