import type WebSocket from 'ws'
import serverConfig from '../global/configuration.js'
import { dbWritesPaused, setDbWritesPaused } from '../global/pauseTraffic.js'
import arraysAreEqual from '../lib/arraysAreEqual.js'
import logDebug from '../lib/logDebug.js'
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
import type { SyncConfiguration } from './config'
import {
  applyRecords,
  deleteRecord as deleteRecordFromDatabase,
  getAllRecordHashes,
  getRecord,
  getRecords
} from './prisma.js'
import {
  connectToServers,
  registerListener,
  sendEvent,
  sendMessage,
  startWebsocket
} from './websocket.js'

let configuration: SyncConfiguration

// Prioritization of tables.
const tableSyncPriority: {
  singleThreaded: TableNamesList
  multiThreaded: TableNamesList
} = {
  singleThreaded: ['user'],
  multiThreaded: ['otp', 'keyPair']
}

/**
 * Initialize the sync service.
 */
export const initSync = () => {
  logDebug('Initializing sync service...')
  configuration = serverConfig.sync

  // Check if the sync service is enabled.
  if (!configuration.enabled) return console.log('Sync service is disabled.')

  console.log('Sync service is enabled.')
  console.log('Server name: ' + configuration.server.name)

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
export const sendRecordHashes = async (ws: WebSocket): Promise<void> => {
  // Wait until the database is ready. Prevents issues with multiple running syncs.
  if (dbWritesPaused()) {
    setTimeout(() => sendRecordHashes(ws), 2500)
    return
  }

  // Pause writes to the database.
  setDbWritesPaused(true)

  logDebug('Sending record hashes to ' + ws.url + '...')
  const recordHashes = await getAllRecordHashes()
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
 * Send record updates to the remote servers.
 *
 * @param tableName Table name.
 * @param record Record data.
 */
export const updateRecord = async (
  tableName: TableNames,
  record: DatabaseRecord
) => {
  logDebug(
    'Sending record update to remote servers, table:',
    tableName,
    'record:',
    record
  )
  sendEvent('sync', 'updateRecord', { tableName, record })
}

/**
 * Send delete record to the remote servers.
 *
 * @param tableName Table name.
 * @param id Record ID.
 * @param time Time of deletion.
 */
export const deleteRecord = (
  tableName: TableNames,
  id: string,
  time: number
) => {
  logDebug(
    'Sending record deletion to remote servers, table:',
    tableName,
    'id:',
    id,
    'time:',
    time
  )
  sendEvent('sync', 'deleteRecord', { tableName, id, time })
}

/**
 * Handle recieved record updates.
 *
 * @param tableName Table name.
 * @param record Record data.
 */
const recieveRecordUpdate = async (
  _: WebSocket,
  { tableName, record }: { tableName: TableNames; record: DatabaseRecord }
) => {
  logDebug('Recieved record update, table:', tableName, 'record:', record)
  const currentRecord = await getRecord(tableName, record.id)
  logDebug('Current record:', currentRecord)

  // Check if the record is a user and is new.
  // Because the user record contains a keypair, that is a separate record.
  if (tableName === 'user' && !currentRecord) {
    logDebug('User record is new. Applying user record.')
    await applyRecords(tableName, [{ ...record, keyPair: undefined }])
    logDebug('Applying keypair record')
    return await applyRecords('keyPair', [{ ...record.keyPair }])
  }

  // Check if the record is newer.
  if (!currentRecord || currentRecord?.updatedAt < record.updatedAt)
    logDebug('Record is newer, applying.')
  return applyRecords(tableName, [record])
}

/**
 * Handle recieved record deletions.
 *
 * @param tableName Table name.
 * @param id Record ID.
 * @param time Time of deletion.
 */
const recieveRecordDeletion = async (
  _: WebSocket,
  { tableName, id, time }: { tableName: TableNames; id: string; time: number }
) => {
  logDebug(
    'Recieved record deletion, table:',
    tableName,
    'id:',
    id,
    'time:',
    time
  )
  const currentRecord = await getRecord(tableName, id)
  logDebug('Current record:', currentRecord)

  // Check if the record exists.
  if (!currentRecord) return logDebug('Record does not exist.')

  // Check if the record is newer.
  if (currentRecord?.updatedAt < new Date(time)) {
    logDebug('Record is newer, deleting.')
    return deleteRecordFromDatabase(tableName, id)
  }

  // Send the current record to the other server.
  logDebug('Record is older, sending current record.')
  updateRecord(tableName, currentRecord)
}

/**
 * Setup the websocket server and connect to all remote servers.
 */
const setupSyncWebsocket = () => {
  logDebug('Setting up sync websocket...')
  setupListeners()
  startWebsocket(configuration.server.port)

  // Connect to remote servers.
  if (configuration.connectOnStart) {
    logDebug('Connecting to remote servers...')
    connectToServers(configuration.servers, configuration.ssl)
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
  logDebug('Recieved record hashes from ' + ws.url + '.')
  logDebug('Remote record hashes:', remoteRecordHashes)
  setDbWritesPaused(true)

  // Compare remote and local tables.
  const localRecordHashes = await getAllRecordHashes()
  const remoteTableNames = Object.keys(remoteRecordHashes) as TableNamesList
  const localTableNames = Object.keys(localRecordHashes) as TableNamesList
  if (!arraysAreEqual(remoteTableNames, localTableNames))
    throw new Error('Mismatching tables on servers, cannot sync.')

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
  logDebug('Sending mismatching hashes:', mismatchingHashes)
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

  // Run single-threaded tables first, since other tables may depend on them.
  await applySingleThreadedRecords(payload, toSend)

  // Run multi-threaded tables second.
  await applyMultiThreadedRecords(payload, toSend)

  // Send the records to the other server.
  sendMessage(ws, 'sync', 'newerRecords', toSend)
}

/**
 * Apply and compare remote records single-threaded.
 *
 * @param records Records to apply.
 * @param toSend Object that should contain the records that will be sent to the other server.
 */
const applySingleThreadedRecords = async (
  records: RecordComparisons,
  toSend: RecordComparisons
) => {
  // Apply the records.
  for (const tableName of tableSyncPriority.singleThreaded) {
    logDebug(
      'Applying records for table:',
      tableName,
      'Records:',
      records,
      'toSend:',
      toSend
    )
    await applyAndCompareRemoteRecords(tableName, records, toSend)
  }
}

/**
 * Apply and compare remote records multi-threaded.
 *
 * @param records Records to apply.
 * @param toSend Object that should contain the records that will be sent to the other server.
 */
const applyMultiThreadedRecords = async (
  records: RecordComparisons,
  toSend: RecordComparisons
) => {
  // Apply the records.
  await Promise.all(
    tableSyncPriority.multiThreaded.map(async (tableName) => {
      await applyAndCompareRemoteRecords(tableName, records, toSend)
    })
  )
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

  // Newer on the other server.
  const remoteOnly = await getRemoteOnlyRecords(tableName, payload)

  // Append newer mismatching records and remote only records.
  toSend[tableName] = {
    localOnly: [],
    mismatchHashes: newerRemote,
    remoteOnly
  }
}

/**
 * Apply records that are newer on the remote server.
 *
 * @param ws Websocket connection.
 * @param payload Newer records from remote server.
 */
const applyNewerRecords = async (ws: WebSocket, payload: RecordComparisons) => {
  const tables = Object.keys(payload) as TableNamesList

  // Run single-threaded tables first.
  await applyNewerRecordsToDbSingleThreaded(payload)

  // Run multi-threaded tables second.
  await applyNewerRecordsToDbMultiThreaded(payload)

  // Send success message.
  sendMessage(ws, 'sync', 'newerApplied', true)

  // Unpause writes to the database.
  setDbWritesPaused(false)
}

/**
 * Apply newer records to the database single-threaded.
 *
 * @param records Records to apply.
 */
const applyNewerRecordsToDbSingleThreaded = async (
  records: RecordComparisons
) => {
  // Apply the records.
  for (const tableName of tableSyncPriority.singleThreaded) {
    await applyNewerRecordsToDb(tableName, records)
  }
}

/**
 * Apply newer records to the database multi-threaded.
 *
 * @param records Records to apply.
 */
const applyNewerRecordsToDbMultiThreaded = async (
  records: RecordComparisons
) => {
  // Apply the records.
  await Promise.all(
    tableSyncPriority.multiThreaded.map(async (tableName) => {
      await applyNewerRecordsToDb(tableName, records)
    })
  )
}

/**
 * Apply newer records to the database.
 *
 * @param tableName Table name.
 * @param payload Record comparisons.
 */
const applyNewerRecordsToDb = async (
  tableName: TableNames,
  payload: RecordComparisons
) => {
  logDebug('Applying newer records for table:', tableName, 'Records:', payload)

  // Apply mismatching remote records.
  const mismatchingRecords = payload[tableName]?.mismatchHashes
  if (!mismatchingRecords) throw new Error('Invalid mismatching records')
  await applyRecords(tableName, mismatchingRecords)

  // Apply remote only records.
  const remoteOnlyRecords = payload[tableName]?.remoteOnly
  if (!remoteOnlyRecords) throw new Error('Invalid remote only records')
  await applyRecords(tableName, remoteOnlyRecords as DatabaseRecord[])
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
 * Handle newer records response status.
 *
 * @param ws Websocket connection.
 * @param success Success.
 */
const handleNewerRecordsResponse = async (ws: WebSocket, success: boolean) => {
  // Check if the response was successful.
  if (!success) throw new Error('Remote server failed to apply newer records!')

  // Unpause writes to the database.
  setDbWritesPaused(false)

  // Run sync again after a delay.
  const time = configuration.fullSyncInterval * 60000
  if (time <= 0) return
  return setTimeout(() => runIntermittentSync(ws), time)
}

/**
 * Runs an intermittent sync.
 *
 * @param ws Websocket connection.
 */
const runIntermittentSync = async (ws: WebSocket) => {
  console.log('Running intermittent sync...')
  return await sendRecordHashes(ws)
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
  logDebug('Setting up sync websocket listeners...')
  registerListener('connection', 'established', sendRecordHashes)
  registerListener('sync', 'recordHashes', recieveRecordHashes)
  registerListener('sync', 'mismatchingRecords', handleMismatchingRecords)
  registerListener('sync', 'newerRecords', applyNewerRecords)
  registerListener('sync', 'newerApplied', handleNewerRecordsResponse)
  registerListener('sync', 'updateRecord', recieveRecordUpdate)
  registerListener('sync', 'deleteRecord', recieveRecordDeletion)
}
