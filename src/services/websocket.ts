import WebSocket, { WebSocketServer } from 'ws'
import type {
  ClientListenerKeys,
  ClientListenerTypes,
  ServerListenerKeys,
  ServerListenerTypes
} from '../types/ListenerTypes.d'
import type {
  OverloadingSendMessage,
  OverloadingWithFunction
} from '../types/Overload.d'
import type { RemoteServer } from '../types/SyncConfiguration'
import type SocketListeners from './../types/SocketListeners.d'

let wss: WebSocketServer | null = null

// Event listeners for websocket connections.
const serverListeners: SocketListeners = {}
const clientListeners: SocketListeners = {}

/**
 * Register a listener for a websocket server event.
 *
 * @param type Listener type.
 * @param event Listener event
 * @param listener Callback function.
 */
export const registerServerListener: OverloadingWithFunction<
  ServerListenerTypes,
  ServerListenerKeys,
  (ws: WebSocket, data: any) => void
> = (
  type: string,
  event: string,
  listener: (ws: WebSocket, data: any) => void
) => {
  registerListener(serverListeners, type, event, listener)
}

/**
 * Register a listener for a websocket client event.
 *
 * @param type Listener type.
 * @param event Listener event
 * @param listener Callback function.
 */
export const registerClientListener: OverloadingWithFunction<
  ClientListenerTypes,
  ClientListenerKeys,
  (ws: WebSocket, data: any) => void
> = (
  type: string,
  event: string,
  listener: (ws: WebSocket, data: any) => void
) => {
  registerListener(clientListeners, type, event, listener)
}

/**
 * Register a listener for a websocket event.
 *
 * @param listeners Object to append the new listener to.
 * @param type Listener type.
 * @param event Listener event
 * @param listener Callback function.
 */
const registerListener = (
  listeners: SocketListeners,
  type: string,
  event: string,
  listener: (ws: WebSocket, data: any) => void
) => {
  if (!listeners[type]) listeners[type] = {}
  if (!listeners[type][event]) listeners[type][event] = []
  listeners[type][event].push(listener)
}

/**
 * Invoke a listener event for websockets.
 *
 * @param listeners Listeners object to use.
 * @param type Type of listener.
 * @param event Event to trigger.
 * @param ws WebSocket connection.
 * @param data Data to send.
 */
const invokeListeners = (
  listeners: SocketListeners,
  type: string,
  event: string,
  ws: WebSocket,
  data: any
) => {
  if (listeners[type] && listeners[type][event]) {
    listeners[type][event].forEach((listener) => listener(ws, data))
  }
}

/**
 * Start the local websocket server.
 *
 * @param port Port to listen on.
 */
export const startWebsocket = (port: number) => {
  wss = new WebSocketServer({ port })
  wss.on('connection', async (ws) => {
    ws.on('message', (message) => {
      const data = JSON.parse(message.toString())
      invokeListeners(serverListeners, data.type, data.event, ws, data.message)
    })

    invokeListeners(serverListeners, 'connection', 'open', ws, null)
  })

  wss.on('listening', () => {
    console.log('Websocket server started on port ' + port)
  })
}

/**
 * Connect to all remote servers.
 *
 * @param servers Array of remote servers.
 */
export const connectToServers = (servers: RemoteServer[]) => {
  for (const server of servers) {
    connectToServer(server)
  }
}

/**
 * Connect to a remote server.
 *
 * @param server Remote server.
 */
export const connectToServer = (server: RemoteServer) => {
  const ws = new WebSocket(`ws://${server.address}`)

  // Handle connection open.
  ws.onopen = () => {
    invokeListeners(clientListeners, 'connection', 'open', ws, null)
    console.log('Connected to server ' + server.name)
  }

  // Handle messages from the server.
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data.toString())
    invokeListeners(clientListeners, data.type, data.event, ws, data.message)
  }

  // Handle errors.
  ws.onerror = () => {
    invokeListeners(clientListeners, 'error', 'error', ws, null)
    console.error('Error connecting to server: ' + server.name)
  }
}

/**
 * Send a client message to a websocket.
 *
 * @param ws WebSocket connection.
 * @param type Type of message.
 * @param event Event to trigger.
 * @param message Message to send.
 */
export const sendClientMessage: OverloadingSendMessage<
  ServerListenerTypes,
  ServerListenerKeys
> = (ws: WebSocket, type: string, event: string, message: any) => {
  sendMessage(ws, type, event, message)
}

/**
 * Send a server message to a websocket.
 *
 * @param ws WebSocket connection.
 * @param type Type of message.
 * @param event Event to trigger.
 * @param message Message to send.
 */
export const sendServerMessage: OverloadingSendMessage<
  ClientListenerTypes,
  ClientListenerKeys
> = (ws: WebSocket, type: string, event: string, message: any) => {
  sendMessage(ws, type, event, message)
}

/**
 * Send a sync message to a websocket.
 *
 * @param ws WebSocket connection.
 * @param message Message to send.
 */
const sendMessage = (
  ws: WebSocket,
  type: string,
  event: string,
  message: any
) => {
  ws.send(
    JSON.stringify({
      type,
      event,
      version: '1.0',
      message
    })
  )
}
