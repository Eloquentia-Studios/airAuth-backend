import type { TableNames } from './RecordHash.d'

export type Records = {
  [K in TableNames]?: unknown[]
}
