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
import {
  applyRecords,
  getAllRecordHashes,
  getRecord,
  getRecords
} from './prisma.js'
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
import DatabaseRecord from './../types/DatabaseRecord.d'

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
  const mismatchingRecords = await compareAndPopulateRecords(
    localHashes,
    remoteHashes,
    tableName
  )
  mismatchingHashes[tableName] = mismatchingRecords
}

/**
 * Compare local and remote records.
 *
 * @param local Local record hashes.
 * @param remote Remote record hashes.
 */
const compareAndPopulateRecords = async (
  local: RecordHash[],
  remote: RecordHash[],
  tableName: TableNames
): Promise<RecordComparison> => {
  return {
    localOnly: await populateRecords(
      getMissingRecords(local, remote),
      tableName
    ),
    remoteOnly: getMissingRecords(remote, local),
    mismatchHashes: await populateRecords(
      differentHash(local, remote),
      tableName
    )
  }
}

/**
 * Populate records with their data.
 *
 * @param records Records to populate.
 * @param tableName Table name.
 * @returns Populated records.
 */
const populateRecords = async (
  records: RecordHash[],
  tableName: TableNames
): Promise<DatabaseRecord[]> => {
  const populatedRecords: DatabaseRecord[] = []
  await Promise.all(
    records.map(async (record) => {
      const populatedRecord = await getRecord(tableName, record.id)
      populatedRecords.push(populatedRecord)
    })
  )
  return populatedRecords
}

/**
 * Handle mismatching records from the remote server.
 *
 * @param ws Websocket.
 * @param payload Mismatching records.
 */
const handleMismatchingRecords = async (
  ws: WebSocket,
  payload: RecordComparisons
) => {
  // NOTE: Local is what the other server has, remote is what we have!
  const tables = Object.keys(payload) as TableNamesList
  const toSend: RecordComparisons = {}
  await Promise.all(
    tables.map((tableName) => {
      return applyAndCompareRemoteRecords(tableName, payload, toSend)
    })
  )

  console.log(toSend)
}

/**
 * Apply local records and newer mismatching records to
 * database, and append older mismatching records together
 * with the remote record data to send to the other server.
 * Notice: Local is what the other server has, remote is what we have!a
 *
 * @param tableName Table name.
 * @param payload Record comparisons.
 * @param toSend Reference to the object to append send data to.
 */
const applyAndCompareRemoteRecords = async (
  tableName: TableNames,
  payload: RecordComparisons,
  toSend: RecordComparisons
) => {
  // Apply all local records.
  await applyLocalRecords(tableName, payload)

  // Check update time of mismatching records.
  const [mismatchingLocal, mismatchingRemote] =
    await getMismatchingRemoteRecords(tableName, payload)

  // Apply mismatching local records.
  await applyMismatchingLocalRecords(
    tableName,
    mismatchingLocal,
    mismatchingRemote
  )

  // Newer on this server.
  const newerRemote = checkNewestUpdateTime(mismatchingRemote, mismatchingLocal)

  const remoteOnly = await getRemoteOnlyRecords(tableName, payload)

  // Append newer mismatching records and remote only records.
  toSend[tableName] = {
    localOnly: [],
    mismatchHashes: newerRemote,
    remoteOnly
  }
}

/**
 * Apply all local records.
 * Notice: Local server is the other server.
 *
 * @param tableName Table name.
 * @param payload Record comparisons from other server.
 */
const applyLocalRecords = async (
  tableName: TableNames,
  payload: RecordComparisons
) => {
  const localRecords = payload[tableName]?.localOnly
  if (!localRecords) throw new Error('Invalid local only records!')
  await applyRecords(tableName, localRecords)
}

/**
 * Apply newer local records to the database.
 * Notice: Local is the other server!
 *
 * @param tableName Table name.
 * @param mismatchingLocal Local mismatching records.
 * @param mismatchingRemote Remote mismatching records.
 */
const applyMismatchingLocalRecords = async (
  tableName: TableNames,
  mismatchingLocal: DatabaseRecord[],
  mismatchingRemote: DatabaseRecord[]
) => {
  const newerLocal = checkNewestUpdateTime(mismatchingLocal, mismatchingRemote)
  await applyRecords(tableName, newerLocal)
}

/**
 * Get all remote only records from the database.
 * Notice: Remote is this server!
 *
 * @param tableName Table name.
 * @param payload Record comparisons.
 * @returns Records from database.
 */
const getRemoteOnlyRecords = async (
  tableName: TableNames,
  payload: RecordComparisons
) => {
  const remoteOnlyRecords = payload[tableName]?.remoteOnly
  if (!remoteOnlyRecords) throw new Error('Invalid remote only records!')
  return await getRecords(
    tableName,
    remoteOnlyRecords.map((r) => r.id)
  )
}

/**
 * Get mismatching remote records.
 *
 * @param tableName Table name.
 * @param payload Payload.
 * @returns Local and remote mismatching records.
 */
const getMismatchingRemoteRecords = async (
  tableName: TableNames,
  payload: RecordComparisons
) => {
  const mismatchingRecordsLocal = payload[tableName]?.mismatchHashes
  if (!mismatchingRecordsLocal) throw new Error('Invalid mismatching records!')
  const mismatchingRecordsRemote = await getRecords(
    tableName,
    mismatchingRecordsLocal.map((r) => r.id)
  )
  return [mismatchingRecordsLocal, mismatchingRecordsRemote]
}

/**
 * Check which records are newer.
 *
 * @param recordsA Records A.
 * @param recordsB Records B.
 * @returns Records that are newer.
 */
const checkNewestUpdateTime = (
  recordsA: DatabaseRecord[],
  recordsB: DatabaseRecord[]
): DatabaseRecord[] => {
  return recordsA.filter((recordA) => {
    const recordB = recordsB.find((r) => r.id === recordA.id)
    if (!recordB) throw new Error('Invalid record B!')
    return recordA.updatedAt > recordB.updatedAt
  })
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
  registerListener('connection', 'established', sendRecordHashes)
  registerListener('sync', 'recordHashes', recieveRecordHashes)
  registerListener('sync', 'mismatchingRecords', handleMismatchingRecords)
}
