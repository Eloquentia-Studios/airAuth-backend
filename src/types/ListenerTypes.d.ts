// Listener types
export interface ListenerTypes {
  connection: 'open' | 'error' | 'connection-info' | 'established'
  sync: 'recordHashes' | 'mismatchingRecords'
}

export type ListenerKeys = keyof ListenerTypes
