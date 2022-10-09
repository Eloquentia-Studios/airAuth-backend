// Listener types
export interface ListenerTypes {
  connection: 'open' | 'error' | 'connection-info' | 'established'
  sync: 'recordHashes' | 'mismatchingRecords' | 'newerRecords' | 'newerApplied'
}

export type ListenerKeys = keyof ListenerTypes
