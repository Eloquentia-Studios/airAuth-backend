import type { RecordHash } from './RecordHash.d'
import type { TableNames } from './RecordHash.d'

export interface RecordComparison {
  localOnly: RecordHash[]
  remoteOnly: RecordHash[]
  mismatchHashes: RecordHash[]
}

export type RecordComparisons = {
  [K in TableNames]?: RecordComparison
}
