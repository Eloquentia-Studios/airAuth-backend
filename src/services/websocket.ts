import WebSocket, { WebSocketServer } from 'ws'
import type { RemoteServer } from '../types/SyncConfiguration'

let wss: WebSocketServer | null = null

/**
 * Start the local websocket server.
 *
 * @param port Port to listen on.
 */
export const startWebsocket = (port: number) => {
  wss = new WebSocketServer({ port })
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      console.log(`Received message => ${message}`)
    })

    ws.send('Hello! Message From Server')
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
  ws.onopen = () => {
    console.log('Connected to server ' + server.name)
    ws.send('Hello! Message From Client!')
  }

  // Handle errors.
  ws.onerror = () => console.error('Error connecting to server: ' + server.name)
}
