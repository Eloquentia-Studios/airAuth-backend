import WebSocket, { WebSocketServer } from 'ws'
import type { RemoteServer } from './sync.js'

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
 *
 * @param servers
 */
export const connectToServers = (servers: RemoteServer[]) => {
  for (const server of servers) {
    connectToServer(server)
  }
}

/**
 *
 * @param server
 */
export const connectToServer = (server: RemoteServer) => {
  const ws = new WebSocket(`ws://${server.address}`)
  ws.onopen = () => {
    console.log('Connected to server ' + server.name)
  }

  // Handle errors.
  ws.onerror = () => console.error('Error connecting to server: ' + server.name)
}
