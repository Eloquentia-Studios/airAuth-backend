// Client listener types
export interface ClientListenerTypes {
  connection: 'open'
  sync: 'recordHashes'
}

export type ClientListenerKeys = keyof ClientListenerTypes

// Server listener types
export interface ServerListenerTypes {
  connection: 'open' | 'error'
}

export type ServerListenerKeys = keyof ServerListenerTypes
