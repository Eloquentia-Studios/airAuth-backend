import { v4 as uuid } from 'uuid'
import WebSocket, { WebSocketServer } from 'ws'
import type { ListenerKeys, ListenerTypes } from '../types/ListenerTypes.d'
import type {
  OverloadingInvokeListener,
  OverloadingSendMessage,
  OverloadingSendMessageAll,
  OverloadingWithFunction
} from '../types/Overload.d'
import type SocketListeners from './../types/SocketListeners.d'
import type { RemoteServer } from './config'
import { getServerInfo } from './sync.js'

// Websocket server and connections.
let wss: WebSocketServer | null = null
const connections = new Map<string, WebSocket>()

// Event listeners for websocket connections.
const socketListeners: SocketListeners = {}

/**
 * Register a listener for a websocket event.
 *
 * @param listeners Object to append the new listener to.
 * @param type Listener type.
 * @param event Listener event
 * @param listener Callback function.
 */
export const registerListener: OverloadingWithFunction<
  ListenerTypes,
  ListenerKeys,
  (ws: WebSocket, data: any) => void
> = (
  type: string,
  event: string,
  listener: (ws: WebSocket, data: any) => void
) => {
  const id = uuid()
  if (!socketListeners[type]) socketListeners[type] = {}
  if (!socketListeners[type][event]) socketListeners[type][event] = {}
  socketListeners[type][event][id] = listener
}

/**
 * Remove a listener from the listeners object.
 *
 * @param id Id of the listener.
 */
export const removeListener = (id: string) => {
  for (const type in socketListeners) {
    for (const event in socketListeners[type]) {
      if (socketListeners[type][event][id]) {
        delete socketListeners[type][event][id]
      }
    }
  }
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
const invokeListeners: OverloadingInvokeListener<
  ListenerTypes,
  ListenerKeys
> = (type: string, event: string, ws: WebSocket, data: any) => {
  if (socketListeners[type] && socketListeners[type][event]) {
    const ids = Object.keys(socketListeners[type][event])
    ids.forEach((id) => socketListeners[type][event][id](ws, data))
  }
}

/**
 * Start the local websocket server.
 *
 * @param port Port to listen on.
 */
export const startWebsocket = (port: number) => {
  wss = new WebSocketServer({ port })
  wss.on('connection', (ws) => {
    sendMessage(ws, 'connection', 'connection-info', getServerInfo())
    listenForServerInfo(ws)
    listenForMessages(ws)
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
export const connectToServers = (servers: RemoteServer[], ssl: boolean) => {
  for (const server of servers) {
    connectToServer(server, ssl)
  }
}

/**
 * Connect to a remote server.
 *
 * @param server Remote server.
 */
export const connectToServer = (server: RemoteServer, ssl: boolean) => {
  const protocol = ssl ? 'wss' : 'ws'
  const setProtocol = server.address.split('://')[0]
  if (setProtocol !== protocol && setProtocol.length <= 3)
    return console.log('Invalid protocol for server in config:', server.name)
  if (setProtocol.length > 3) server.address = protocol + '://' + server.address

  // Handle connection open.
  const ws = new WebSocket(server.address)
  ws.onopen = () => {
    if (checkAndAddConnection(server.name, ws)) {
      invokeListeners('connection', 'established', ws, null)
    }
  }

  // Handle errors.
  ws.onerror = () => {
    invokeListeners('connection', 'error', ws, server)
    console.log('Unable to connect to server:', server.name)
  }
}

/**
 * Add a new socket connection.
 *
 * @param name Name of the connection.
 * @param ws WebSocket connection.
 * @returns True if the connection was added, false if it already exists.
 */
const checkAndAddConnection = (name: string, ws: WebSocket) => {
  // Check if the connection already exists.
  if (!connections.has(name) || connections.get(name)?.readyState !== ws.OPEN) {
    addConnection(name, ws)
    return true
  }

  // Connection already exists.
  sendMessage(ws, 'connection', 'error', 'Already connected to server.')
  ws.close()
  return false
}

/**
 * Add a new connection to the connections map.
 *
 * @param name Name of the connection.
 * @param ws WebSocket connection.
 */
const addConnection = (name: string, ws: WebSocket) => {
  // Add the connection.
  connections.set(name, ws)

  // Listen for events.
  listenForServerInfo(ws, false)
  listenForMessages(ws)
  listenForErrors(ws)

  // Invoke the connection event.
  invokeListeners('connection', 'open', ws, null)

  console.log('Connected to server:', name)
}

/**
 * Listen for messages on a websocket connection.
 *
 * @param ws WebSocket connection.
 */
const listenForMessages = (ws: WebSocket) => {
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data.toString())
    invokeListeners(data.type, data.event, ws, data.message)
  }
}

/**
 * Listen for errors on a websocket connection.
 *
 * @param ws WebSocket connection.
 */
const listenForErrors = (ws: WebSocket) => {
  ws.onerror = (event) => {
    invokeListeners('connection', 'error', ws, event)
    console.error('Error on websocket connection:', event)
  }
}

/**
 * Listen for the server information.
 *
 * @param ws WebSocket connection.
 * @param server True if the connection is to a server, false if it is from a client.
 */
const listenForServerInfo = (ws: WebSocket, server = true) => {
  const listener = registerListener(
    'connection',
    'connection-info',
    (ws, data) => {
      console.log('Connection info:', data)
      if (ws === ws && data?.name) {
        if (server) checkAndAddConnection(data.name, ws)
        else sendMessage(ws, 'connection', 'connection-info', getServerInfo())
        removeListener(listener)
      }
    }
  )
}

/**
 * Send an event to a websocket.
 *
 * @param ws WebSocket connection.
 * @param message Message to send.
 */
export const sendMessage: OverloadingSendMessage<
  ListenerTypes,
  ListenerKeys
> = (ws: WebSocket, type: string, event: string, message: any) => {
  ws.send(
    JSON.stringify({
      type,
      event,
      version: '1.0',
      message
    })
  )
}

/**
 * Send an event to all websockets.
 *
 * @param type Type of event.
 * @param event Event to send.
 * @param message Message to send.
 */
export const sendEvent: OverloadingSendMessageAll<
  ListenerTypes,
  ListenerKeys
> = (type: string, event: string, message: any) => {
  // @ts-expect-error - This is checked by overloading.
  connections.forEach(async (ws) => sendMessage(ws, type, event, message))
}
