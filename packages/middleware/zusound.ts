/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */
import type { StateCreator } from 'zustand/vanilla'
import coreImpl, { CoreOptions } from '../core'
import { DIFF_CHUNK_EVENT_NAME } from '../shared-types'
import { isProduction } from './utils'

type AnyStateCreator<T, U extends any[], V extends any[]> = StateCreator<T, U, V, T>

export function zusound<T, U extends any[], V extends any[]>(
  initializer: AnyStateCreator<T, any, any>,
  options: CoreOptions = {}
): AnyStateCreator<T, any, any> {
  return (set, get, api) => {
    const { enabled, ...opts } = options
    const initialState = initializer(set, get, api)

    if (enabled || !isProduction) {
      api.subscribe((state, prevState) => coreImpl(state, prevState, opts))
      if (typeof window !== 'undefined' && !(DIFF_CHUNK_EVENT_NAME in window)) {
        window[DIFF_CHUNK_EVENT_NAME] = true
        window.addEventListener(DIFF_CHUNK_EVENT_NAME, () => {})
      }
    }
    return initialState
  }
}
