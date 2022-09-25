import WebSocket, { WebSocketServer } from 'ws'
import type RecordHashes from '../types/RecordHashes.d'
import type { RemoteServer } from '../types/SyncConfiguration'
import { getOtpHashes } from './otp.js'
import { getUserHashes, getKeypairHashes } from './users.js'

let wss: WebSocketServer | null = null

/**
 * Start the local websocket server.
 *
 * @param port Port to listen on.
 */
export const startWebsocket = (port: number) => {
  wss = new WebSocketServer({ port })
  wss.on('connection', async (ws) => {
    ws.on('message', (message) => {
      console.log(`Received message => ${message}`)
    })

    // Send the hashes to the other sever.
    sendRecordHashes(ws)
  })

  wss.on('listening', () => {
    console.log('Websocket server started on port ' + port)
  })
}

/**
 * Send all records as hashes to the remote server.
 *
 * @param ws Websocket to send the message via.
 */
export const sendRecordHashes = async (ws: WebSocket) => {
  // Get all record hashes.
  const recordHashes: RecordHashes = {
    users: await getUserHashes(),
    keyPairs: await getKeypairHashes(),
    otps: await getOtpHashes()
  }

  // Send the hashes to the other sever.
  ws.send(JSON.stringify(recordHashes))
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
  }

  ws.onmessage = (event) => {
    console.log(JSON.parse(event.data.toString()))
  }

  // Handle errors.
  ws.onerror = () => console.error('Error connecting to server: ' + server.name)
}
