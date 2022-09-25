import type RecordHash from './RecordHash.d'

export default interface RecordHashes {
  users: RecordHash[]
  keyPairs: RecordHash[]
  otps: RecordHash[]
}
