import type { StateCreator, StoreMutatorIdentifier } from 'zustand/vanilla'
import coreImpl, { CoreOptions } from '../core'
import { SONIC_CHUNK_EVENT_NAME, SonicChunk } from '../shared-types/sonic-chunk'
import { DIFF_CHUNK_EVENT_NAME } from '../shared-types/diff-chunk'
import { DiffChunk } from '../shared-types/diff-chunk'

type Cast<T, U> = T extends U ? T : U
type Write<T, U> = Omit<T, keyof U> & U
type TakeTwo<T> = T extends { length: 0 }
  ? [undefined, undefined]
  : T extends { length: 1 }
  ? [...args0: Cast<T, unknown[]>, arg1: undefined]
  : T extends { length: 0 | 1 }
  ? [...args0: Cast<T, unknown[]>, arg1: undefined]
  : T extends { length: 2 }
  ? T
  : T extends { length: 1 | 2 }
  ? T
  : T extends { length: 0 | 1 | 2 }
  ? T
  : T extends [infer A0, infer A1, ...unknown[]]
  ? [A0, A1]
  : T extends [infer A0, (infer A1)?, ...unknown[]]
  ? [A0, A1?]
  : T extends [(infer A0)?, (infer A1)?, ...unknown[]]
  ? [A0?, A1?]
  : never

type WithZusound<S> = Write<S, StoreZusound<S>>

type Action =
  | string
  | {
      type: string
      [x: string | number | symbol]: unknown
    }
type StoreZusound<S> = S extends {
  setState: {
    // capture both overloads of setState
    (...args: infer Sa1): infer Sr1
    (...args: infer Sa2): infer Sr2
  }
}
  ? {
      setState(...args: [...args: TakeTwo<Sa1>, action?: Action]): Sr1
      setState(...args: [...args: TakeTwo<Sa2>, action?: Action]): Sr2
    }
  : never

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ZusoundOptions extends CoreOptions {
  // TODO: add options
}

type Zusound = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
  U = T
>(
  initializer: StateCreator<T, [...Mps, ['zustand/zusound', never]], Mcs, U>,
  options?: ZusoundOptions
) => StateCreator<T, Mps, [['zustand/zusound', never], ...Mcs]>

declare module 'zustand/vanilla' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StoreMutators<S, A> {
    'zustand/zusound': WithZusound<S>
  }
}

type ZusoundImpl = <T>(
  storeInitializer: StateCreator<T, [], []>,
  options?: ZusoundOptions
) => StateCreator<T, [], []>

const zusoundImpl: ZusoundImpl =
  (fn, opt = {}) =>
  (set, get, api) => {
    const { enabled: _enabled, ...options } = opt
    const initialState = fn(set, get, api)

    const enabled = _enabled ?? true

    if (!enabled) {
      return initialState
    }

    api.subscribe((state, prevState) => {
      return coreImpl(state, prevState, options)
    })

    if (typeof window !== 'undefined' && !(SONIC_CHUNK_EVENT_NAME in window)) {
      window[SONIC_CHUNK_EVENT_NAME] = 'SONIC_CHUNK_EVENT_NAME'
      console.log('listening', 'SONIC_CHUNK_EVENT_NAME')
      window.addEventListener(SONIC_CHUNK_EVENT_NAME, event => {
        // TODO:: Event handling
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { detail } = event as CustomEvent<SonicChunk>
        // sonifyChanges(detail, 100)
        // console.log('sonicChunk', detail)
      })
    }

    if (typeof window !== 'undefined' && !(DIFF_CHUNK_EVENT_NAME in window)) {
      window[DIFF_CHUNK_EVENT_NAME] = 'DIFF_CHUNK_EVENT_NAME'
      console.log('listening', 'DIFF_CHUNK_EVENT_NAME')
      window.addEventListener(DIFF_CHUNK_EVENT_NAME, event => {
        // TODO:: Event handling
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { detail } = event as CustomEvent<DiffChunk>
        // console.log('diffChunk', detail)
      })
    }

    return initialState
  }

export const zusound = zusoundImpl as unknown as Zusound
