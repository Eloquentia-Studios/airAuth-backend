// Client listener types
export interface ClientListenerTypes {
  connection: 'open' | 'close' | 'error' | 'message'
  sync: 'ad'
}

export type ClientListenerKeys = keyof ClientListenerTypes

// Server listener types
export interface ServerListenerTypes {
  connection: 'open' | 'close' | 'error' | 'message'
  sync: 'ad'
}

export type ServerListenerKeys = keyof ClientListenerTypes
