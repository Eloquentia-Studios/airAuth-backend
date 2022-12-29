import type WebSocket from 'ws'

export interface SocketMiddleware {
  [key: string]: {
    [key: string]: SocketMiddlewareFunction
  }
}

export type SocketMiddlewareFunction = (
  ws: WebSocket,
  data: any
) => Promise<boolean>
