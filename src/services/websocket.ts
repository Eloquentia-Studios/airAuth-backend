import { v4 as uuid } from 'uuid'
import WebSocket, { WebSocketServer } from 'ws'
import { minutes } from '../global/time.js'
import logDebug from '../lib/logDebug.js'
import type { ListenerKeys, ListenerTypes } from '../types/ListenerTypes.d'
import type {
  OverloadingInvokeListener,
  OverloadingSendMessage,
  OverloadingSendMessageAll,
  OverloadingWithFunction
} from '../types/Overload.d'
import {
  SocketMiddleware,
  SocketMiddlewareFunction
} from '../types/SocketMiddleware.js'
import serverConfig from './../global/configuration.js'
import type SocketListeners from './../types/SocketListeners.d'
import type { RemoteServer, WebsocketConfiguration } from './config'

let configuration: WebsocketConfiguration

// Websocket server and connections.
let wss: WebSocketServer | null = null
const connections = new Map<string, WebSocket>()

// Event listeners for websocket connections.
const socketListeners: SocketListeners = {}
const socketMiddleware: SocketMiddleware = {}

/**
 * Initialize the websocket service.
 */
export const initWebsocket = () => {
  configuration = serverConfig.websocket

  if (!configuration.enabled) return console.log('Websocket disabled.')
  console.log('Websocket enabled.')

  startWebsocket(configuration.server.port)

  if (configuration.connectOnStart) {
    logDebug('Connecting to remote servers...')
    connectToServers(configuration.servers)
  }
}

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
  logDebug(`Registered listener for ${type}:${event}.`)
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
        logDebug(`Removed listener ${id} for ${type}:${event}.`)
      }
    }
  }
}

/**
 * Register a middleware for a websocket event type.
 *
 * @param type Type of event.
 * @param middleware Middleware function.
 */
export const registerMiddlewareForType = (
  type: ListenerKeys,
  middleware: SocketMiddlewareFunction
) => {
  const id = uuid()
  if (!socketMiddleware[type]) socketMiddleware[type] = {}
  // @ts-ignore - Above line makes sure this is not undefined.
  socketMiddleware[type][id] = middleware
  logDebug(`Registered middleware for ${type}.`)
  return id
}

/**
 * Remove a middleware from the middleware object.
 */
export const removeMiddleware = (id: string) => {
  for (const type in socketMiddleware) {
    if (socketMiddleware[type][id]) {
      delete socketMiddleware[type][id]
      logDebug(`Removed middleware ${id} for ${type}.`)
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
> = async (type: string, event: string, ws: WebSocket, data: any) => {
  logDebug(`Invoking listeners and middleware for ${type}:${event}.`)

  // Execute middleware.
  if (socketMiddleware[type]) {
    const ids = Object.keys(socketMiddleware[type])
    for (const id of ids) {
      const response = await socketMiddleware[type][id](ws, data)
      if (!response) return
    }
  }

  // Execute listeners.
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
  logDebug('Starting websocket server...')
  wss = new WebSocketServer({ port })
  wss.on('connection', (ws) => {
    logDebug('New websocket connection.')
    sendMessage(ws, 'connection', 'connection-info', getServerInfo())
    listenForServerInfo(ws, true)
    listenForMessages(ws)
    listenForDisconnect(ws)
  })

  wss.on('listening', () => {
    logDebug('Websocket server started.')
    console.log('Websocket server started on port', port)
  })
}

/**
 * Connect to all remote servers.
 *
 * @param servers Array of remote servers.
 */
export const connectToServers = (servers: RemoteServer[]) => {
  logDebug('Connecting to remote servers...')
  for (const server of servers) {
    connectToServer(server)
  }

  const connectInterval = configuration.tryConnectInterval * minutes
  setInterval(connectToDisconnectedServers, connectInterval)
}

/**
 * Connect to a remote server.
 *
 * @param server Remote server.
 */
export const connectToServer = (server: RemoteServer, log = true) => {
  logDebug('Connecting to remote server:', server.name)
  const protocol = configuration.ssl ? 'wss' : 'ws'
  const setProtocol = server.address.split('://')[0]
  if (setProtocol !== protocol && setProtocol.length <= 3)
    return console.log('Invalid protocol for server in config:', server.name)
  if (setProtocol.length > 3) server.address = protocol + '://' + server.address
  logDebug(`Connecting to server: ${server.address}`)

  // Handle connection open.
  const ws = new WebSocket(server.address)
  ws.onopen = () => {
    logDebug('Connected to server:', server.name)
    if (connectionAlreadyExists(server.name, ws)) {
      listenForServerInfo(ws, false)
      invokeListeners('connection', 'established', ws, null)
      addConnection(server.name, ws)
      listenForDisconnect(ws)
    } else {
      closeDuplicateConnection(ws, server.name)
    }
  }

  // Handle errors.
  ws.onerror = (e) => {
    invokeListeners('connection', 'error', ws, server)
    if (log) console.log('Unable to connect to server:', server.name)
    logDebug(`Websocket error for '${server.name}':`, e.message)
  }

  return ws
}

/**
 * Connect to all disconnected servers.
 */
const connectToDisconnectedServers = () => {
  const disconnected = configuration.servers.filter(
    (server) => !connections.has(server.name)
  )
  if (disconnected.length === 0)
    return logDebug('No disconnected servers to connect to.')

  console.log('Trying to connect to disconnected servers...')
  for (const server of disconnected) {
    connectToServer(server, false)
  }
}

/**
 * Add a new socket connection.
 *
 * @param name Name of the connection.
 * @param ws WebSocket connection.
 * @returns True if the connection was added, false if it already exists.
 */
const connectionAlreadyExists = (name: string, ws: WebSocket) =>
  !connections.has(name) || connections.get(name)?.readyState !== ws.OPEN

/**
 * Add a new connection to the connections map.
 *
 * @param name Name of the connection.
 * @param ws WebSocket connection.
 */
const addConnection = (name: string, ws: WebSocket) => {
  // Add the connection.
  logDebug('Adding connection:', name)
  connections.set(name, ws)

  // Listen for events.
  logDebug('Listening for events on connection:', name)
  listenForMessages(ws)
  listenForErrors(ws)

  // Invoke the connection event.
  invokeListeners('connection', 'open', ws, null)

  console.log('Connected to server:', name)
}

/**
 * Close a duplicate connection.
 *
 * @param ws WebSocket connection.
 * @param name Name of the connection.
 */
const closeDuplicateConnection = (ws: WebSocket, name: string) => {
  logDebug('Connection already exists:', name)
  sendMessage(ws, 'connection', 'error', 'Already connected to server.')
  ws.close()
}

/**
 * Listen for socket disconnects.
 *
 * @param ws WebSocket connection.
 */
const listenForDisconnect = (ws: WebSocket) => {
  ws.onclose = () => {
    const name = getConnectionName(ws)
    if (name) {
      console.info('Disconnected from server:', name)
      connections.delete(name)
    } else console.info('Connection closed for unknown server.')

    invokeListeners('connection', 'close', ws, name)

    tryToReconnect(ws, name)
  }
}

/**
 * Try to reconnect to a server.
 *
 * @param ws WebSocket connection.
 * @param name Name of the connection.
 * @param count Number of times the connection has been attempted.
 */
const tryToReconnect = (
  old: WebSocket,
  name: string | undefined,
  count: number = 0
) => {
  if (count > 10) return console.log('Unable to reconnect to server:', name)
  const server = getServerByName(name as string)
  if (!server) return logDebug('Unable to find server by name:', name)

  const ws = connectToServer(server, false)
  if (!ws) return logDebug('Connect to server returned void!')

  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) clearInterval(interval)
    else if (ws.readyState === ws.CLOSED) {
      logDebug('Unable to reconnect to server:', name)
      clearInterval(interval)
      tryToReconnect(old, name, count + 1)
    }
  }, 1000)
}

/**
 * Listen for messages on a websocket connection.
 *
 * @param ws WebSocket connection.
 */
const listenForMessages = (ws: WebSocket) => {
  ws.onmessage = (event) => {
    logDebug('Received message on websocket connection:', event.data)
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
const listenForServerInfo = (_ws: WebSocket, server = true) => {
  const listener = registerListener(
    'connection',
    'connection-info',
    (ws, data) => {
      logDebug('Received connection info from peer:', data?.name)
      if (_ws === ws && data?.name) {
        logDebug('Adding connection:', data.name, 'from server:', server)
        if (server) {
          // Check if the connection already exists.
          if (connectionAlreadyExists(data.name, ws))
            addConnection(data.name, ws)
          else closeDuplicateConnection(ws, data.name)
        } else sendMessage(ws, 'connection', 'connection-info', getServerInfo())
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
  logDebug(
    'Sending message to websocket. Type:',
    type,
    'Event:',
    event,
    'Message:',
    JSON.stringify(message)
  )
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

/**
 * Get the name of a connection.
 *
 * @param ws WebSocket connection.
 * @returns Name of the connection or undefined if it doesn't exist.
 */
const getConnectionName = (ws: WebSocket) => {
  for (const [name, connection] of connections)
    if (connection === ws) return name
  return undefined
}

/**
 * Get server information.
 *
 * @returns Server name.
 */
const getServerInfo = () => ({
  name: configuration.server.name
})

/**
 * Get a server configuration by name.
 *
 * @param name Server name.
 * @returns Server configuration or undefined.
 */
export const getServerByName = (name: string) => {
  return configuration.servers.find((server) => server.name === name)
}

/**
 * Get all remote servers.
 *
 * @returns Array of servers.
 */
export const getRemoteServers = () => {
  return configuration.servers
}
