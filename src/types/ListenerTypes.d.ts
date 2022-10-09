// Listener types
export interface ListenerTypes {
  connection: 'open' | 'error' | 'connection-info' | 'established'
  sync: 'recordHashes' | 'mismatchingRecords' | 'newerRecords'
}

export type ListenerKeys = keyof ListenerTypes
