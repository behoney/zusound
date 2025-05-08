/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StateCreator } from 'zustand/vanilla'
import coreImpl, { CoreOptions } from '../core'
import { DIFF_CHUNK_EVENT_NAME } from '../shared-types'

type AnyStateCreator<T, U extends any[], V extends any[]> = StateCreator<T, U, V, T>

export function zusound<T, U extends any[], V extends any[]>(
  initializer: AnyStateCreator<T, U, V>,
  options: CoreOptions = {}
): AnyStateCreator<T, U, V> {
  return (set, get, api) => {
    const { enabled: _enabled, ...opts } = options
    const initialState = initializer(set, get, api)
    const enabled = _enabled ?? true
    if (enabled) {
      api.subscribe((state, prevState) => coreImpl(state, prevState, opts))
      if (typeof window !== 'undefined' && !(DIFF_CHUNK_EVENT_NAME in window)) {
        window[DIFF_CHUNK_EVENT_NAME] = true
        window.addEventListener(DIFF_CHUNK_EVENT_NAME, () => {})
      }
    }
    return initialState
  }
}
