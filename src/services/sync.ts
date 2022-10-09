import fs from 'fs'
import type WebSocket from 'ws'
import {
  connectToServers,
  registerListener,
  sendMessage,
  startWebsocket
} from './websocket.js'
import type { SyncConfiguration } from '../types/SyncConfiguration'
import type RecordHashes from '../types/RecordHashes.d'
import { syncConfiguration } from '../types/SyncConfiguration.js'
import { getOtpHashes } from './otp.js'
import { getUserHashes, getKeypairHashes } from './users.js'
import type RecordHash from '../types/RecordHash.d'

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
 * Send all records as hashes to the remote server.
 *
 * @param ws Websocket to send the message via.
 */
export const sendRecordHashes = async (ws: WebSocket) => {
  // Get all record hashes.
  const recordHashes = await getAllRecordHashes()

  // Send the hashes to the other sever.
  sendMessage(ws, 'sync', 'recordHashes', recordHashes)
}

/**
 * Get server information.
 *
 * @returns Server name.
 */
export const getServerInfo = () => ({
  name: configuration.server.name
})

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
 * Get all record hashes from the database.
 *
 * @returns All record hashes.
 */
const getAllRecordHashes = async (): Promise<RecordHashes> => ({
  users: await getUserHashes(),
  keyPairs: await getKeypairHashes(),
  otps: await getOtpHashes()
})

/**
 * Recieve record hashes from the remote server.
 *
 * @param ws Websocket.
 * @param data Record hashes.
 */
const recieveRecordHashes = async (
  ws: WebSocket,
  remoteRecordHashes: RecordHashes
) => {
  // Compare remote and local record hashes.
  const localRecordHashes = await getAllRecordHashes()
  const mismatchingUserRecords = compareRecords(
    localRecordHashes.users,
    remoteRecordHashes.users,
    ws
  )
  const mismatchingKeyPairRecords = compareRecords(
    localRecordHashes.keyPairs,
    remoteRecordHashes.keyPairs,
    ws
  )
  const mismatchingOtpRecords = compareRecords(
    localRecordHashes.otps,
    remoteRecordHashes.otps,
    ws
  )

  // Send mismatching records to the other server.
  const payload = {
    users: mismatchingUserRecords,
    keyPairs: mismatchingKeyPairRecords,
    otps: mismatchingOtpRecords
  }
  sendMessage(ws, 'sync', 'mismatchingRecords', payload)
}

/**
 * Compare local and remote records.
 *
 * @param local Local record hashes.
 * @param remote Remote record hashes.
 */
const compareRecords = (
  local: RecordHash[],
  remote: RecordHash[],
  ws: WebSocket
) => {
  return {
    localOnly: getMissingRecords(local, remote),
    remoteOnly: getMissingRecords(remote, local),
    mismatchHashes: differentHash(local, remote)
  }
}

const handleMismatchingRecords = (
  ws: WebSocket,
  payload: {
    users: {
      localOnly: RecordHash[]
      remoteOnly: RecordHash[]
      mismatchHashes: RecordHash[]
    }
    keyPairs: {
      localOnly: RecordHash[]
      remoteOnly: RecordHash[]
      mismatchHashes: RecordHash[]
    }
    otps: {
      localOnly: RecordHash[]
      remoteOnly: RecordHash[]
      mismatchHashes: RecordHash[]
    }
  }
) => {
  console.log('Users:', payload.users)
  console.log('Key pairs:', payload.keyPairs)
  console.log('OTPs:', payload.otps)
}

/**
 * Compare two lists of record hashes and return the records that are not in the other list.
 *
 * @param x List of record hashes.
 * @param y List of record hashes to compare against.
 * @returns List of record hashes that are not y.
 */
const getMissingRecords = (x: RecordHash[], y: RecordHash[]) =>
  x.filter((a) => !y.some((b) => a.id === b.id))

/**
 * Compare two lists of record hashes and return the records that have different hashes.
 *
 * @param x List of record hashes.
 * @param y List of record hashes to compare against.
 * @returns List of record hashes that have different hashes.
 */
const differentHash = (x: RecordHash[], y: RecordHash[]) =>
  x.filter((a) => y.some((b) => a.id === b.id && a.hash !== b.hash))

/**
 * Setup sync websocket listeners.
 */
const setupListeners = () => {
  // Send & listen for record hashes
  registerListener('connection', 'open', sendRecordHashes)
  registerListener('sync', 'recordHashes', recieveRecordHashes)
  registerListener('sync', 'mismatchingRecords', handleMismatchingRecords)
}
