import type DatabaseRecord from './DatabaseRecord.d'
import type { RecordHash } from './RecordHash.d'
import type { TableNames } from './RecordHash.d'

export interface RecordComparison {
  localOnly: DatabaseRecord[]
  remoteOnly: RecordHash[]
  mismatchHashes: DatabaseRecord[]
}

export type RecordComparisons = {
  [K in TableNames]?: RecordComparison
}
