import fs from 'fs'
import type WebSocket from 'ws'
import {
  connectToServers,
  registerListener,
  sendMessage,
  startWebsocket
} from './websocket.js'
import type { SyncConfiguration } from '../types/SyncConfiguration'
import { syncConfiguration } from '../types/SyncConfiguration.js'
import { getAllRecordHashes } from './prisma.js'
import arraysAreEqual from '../lib/arraysAreEqual.js'
import type {
  RecordComparison,
  RecordComparisons
} from '../types/RecordComparison.d'
import type {
  RecordHash,
  RecordHashes,
  TableNames,
  TableNamesList
} from '../types/RecordHash.js'
import { Console } from 'console'

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
 * Recieve record hashes from the remote server.
 *
 * @param ws Websocket.
 * @param data Record hashes.
 */
const recieveRecordHashes = async (
  ws: WebSocket,
  remoteRecordHashes: RecordHashes
) => {
  // Compare remote and local tables.
  const localRecordHashes = await getAllRecordHashes()
  const remoteTableNames = Object.keys(remoteRecordHashes) as TableNamesList
  const localTableNames = Object.keys(localRecordHashes) as TableNamesList
  if (!arraysAreEqual(remoteTableNames, localTableNames)) {
    throw new Error('Mismatching tables on servers, cannot sync.')
  }

  // Compare records.
  const mismatchingHashes: RecordComparisons = {}
  await Promise.all(
    localTableNames.map((tableName) =>
      getMismatchingRecords(
        tableName,
        localRecordHashes,
        remoteRecordHashes,
        mismatchingHashes
      )
    )
  )

  // Send mismatching records to the other server.
  sendMessage(ws, 'sync', 'mismatchingRecords', mismatchingHashes)
}

/**
 * Get mismatching records for a table.
 *
 * @param tableName Table name.
 * @param localRecordHashes Local record hashes.
 * @param remoteRecordHashes Remote record hashes.
 * @param mismatchingHashes Mismatching hashes.
 */
const getMismatchingRecords = async (
  tableName: TableNames,
  localRecordHashes: RecordHashes,
  remoteRecordHashes: RecordHashes,
  mismatchingHashes: RecordComparisons
) => {
  const localHashes = localRecordHashes[tableName]
  const remoteHashes = remoteRecordHashes[tableName]
  if (!localHashes || !remoteHashes) throw new Error('Invalid table name')
  const mismatchingRecords = await compareRecords(localHashes, remoteHashes)
  mismatchingHashes[tableName] = mismatchingRecords
}

/**
 * Compare local and remote records.
 *
 * @param local Local record hashes.
 * @param remote Remote record hashes.
 */
const compareRecords = async (
  local: RecordHash[],
  remote: RecordHash[]
): Promise<RecordComparison> => {
  return {
    localOnly: getMissingRecords(local, remote),
    remoteOnly: getMissingRecords(remote, local),
    mismatchHashes: differentHash(local, remote)
  }
}

/**
 * Handle mismatching records from the remote server.
 *
 * @param ws Websocket.
 * @param payload Mismatching records.
 */
const handleMismatchingRecords = (
  ws: WebSocket,
  payload: RecordComparisons
) => {
  // TODO: Handle mismatching records.
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
