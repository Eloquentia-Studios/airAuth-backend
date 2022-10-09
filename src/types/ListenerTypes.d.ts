// Listener types
export interface ListenerTypes {
  connection: 'open' | 'error' | 'connection-info'
  sync: 'recordHashes'
}

export type ListenerKeys = keyof ListenerTypes
