// Listener types
export interface ListenerTypes {
  connection: 'open' | 'error' | 'connection-info'
  sync: 'recordHashes' | 'mismatchingRecords'
}

export type ListenerKeys = keyof ListenerTypes
