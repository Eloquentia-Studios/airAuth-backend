import type WebSocket from 'ws'

export default interface SocketListeners {
  [key: string]: {
    [key: string]: { [key: string]: (ws: WebSocket, data: any) => void }
  }
}

export type SocketListenerFunction = (ws: WebSocket, data: any) => void
