import { zusound } from './zusound'

declare global {
  interface ImportMeta {
    env?: {
      PROD?: boolean
      DEV?: boolean
    }
  }
}

export { zusound }
