import fs from 'fs'
import type WebSocket from 'ws'
import {
  connectToServers,
  registerClientListener,
  registerServerListener,
  startWebsocket
} from './websocket.js'
import type { SyncConfiguration } from '../types/SyncConfiguration'
import type RecordHashes from '../types/RecordHashes.d'
import { syncConfiguration } from '../types/SyncConfiguration.js'
import { getOtpHashes } from './otp.js'
import { getUserHashes, getKeypairHashes } from './users.js'

let configuration: SyncConfiguration

/**
 * Initialize the sync service.
 */
export const initSync = () => {
  const configPath = process.env.CONFIG_PATH || './config/config.json'
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  configuration = config.sync as SyncConfiguration

  // Check configuration validity.
  const result = syncConfiguration.safeParse(configuration)
  if (!result.success) {
    console.error(result.error)
    throw new Error('Sync configuration is invalid')
  }

  // Check if the sync service is enabled.
  if (!configuration.enabled) {
    console.log('Sync service is disabled.')
    return
  } else {
    console.log('Sync service is enabled.')
    console.log('Server name: ' + configuration.server.name)
  }

  // Wait for the start delay.
  setTimeout(() => {
    // Setup all websocket connections.
    setupSyncWebsocket()
  }, configuration.startDelay)
}

/**
 * Setup the websocket server and connect to all remote servers.
 */
const setupSyncWebsocket = () => {
  // Setup the websocket listeners.
  setupListeners()

  // Start the websocket server.
  startWebsocket(configuration.server.port)

  // Connect to remote servers.
  if (configuration.connectOnStart) {
    connectToServers(configuration.servers)
  }
}

/**
 * Setup sync websocket listeners.
 */
const setupListeners = () => {
  registerServerListener('connection', 'open', (ws, data) =>
    sendRecordHashes(ws)
  )

  registerClientListener('sync', 'recordHashes', (ws, data) => {
    const hashes = data as RecordHashes
    console.log(hashes)
  })
}

/**
 * Send a sync message to a websocket.
 *
 * @param ws WebSocket connection.
 * @param message Message to send.
 */
const sendSyncMessage = (ws: WebSocket, event: string, message: any) => {
  ws.send(
    JSON.stringify({
      type: 'sync',
      event,
      version: '1.0',
      message
    })
  )
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
  sendSyncMessage(ws, 'recordHashes', recordHashes)
}
