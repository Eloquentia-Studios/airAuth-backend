// Listener types
export interface ListenerTypes {
  connection: 'open' | 'error' | 'connection-info' | 'established' | 'close'
  sync:
    | 'recordHashes'
    | 'mismatchingRecords'
    | 'newerRecords'
    | 'newerApplied'
    | 'updateRecord'
    | 'deleteRecord'
    | 'syncDisabled'
}

export type ListenerKeys = keyof ListenerTypes
