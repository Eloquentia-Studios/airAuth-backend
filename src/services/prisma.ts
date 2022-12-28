import Prisma from '@prisma/client'
import clone from '../lib/clone.js'
import logDebug from '../lib/logDebug.js'
import type DatabaseRecord from '../types/DatabaseRecord.d'
import type {
  RecordHashes,
  TableNames,
  TableNamesList
} from '../types/RecordHash.d'
import memoize from './../lib/memoize.js'
import type { Records } from './../types/Records.d'

const prisma = new Prisma.PrismaClient()
export default prisma

// Prioritization of tables.
export const tablePriority: {
  ordered: TableNamesList
  unordererd: TableNamesList
} = {
  ordered: ['user'],
  unordererd: ['otp', 'keyPair', 'backup']
}

/**
 * Get all record hashes for all models in prisma.
 *
 * @returns Record hashes.
 */
export const getAllRecordHashes = async () => {
  logDebug('Getting all record hashes.')
  const modelNames = getAllModels()
  const recordHashes: RecordHashes = {}

  await Promise.all(
    modelNames.map(async (modelName) => {
      // @ts-ignore - Prisma model names are dynamic.
      recordHashes[modelName] = await prisma[modelName].findMany({
        select: {
          id: true,
          hash: true
        }
      })
    })
  )

  logDebug(
    'Got',
    countRecords(recordHashes),
    'record hashes from the database.'
  )
  return recordHashes
}

/**
 * Get all records for all models in prisma.
 *
 * @returns Records.
 */
export const getAllRecords = async (): Promise<Records> => {
  logDebug('Getting all records.')
  const modelNames = getAllModels()
  const records: Records = {}

  await Promise.all(
    modelNames.map(async (modelName) => {
      // @ts-ignore - Prisma model names are dynamic.
      records[modelName] = await prisma[modelName].findMany()
    })
  )

  logDebug('Got', countRecords(records), 'records from the database.')
  return records
}

/**
 * Drop all records from all models in prisma.
 */
export const dropAllRecords = async () => {
  logDebug('Dropping all records.')

  await Promise.all(
    tablePriority.unordererd.map(async (modelName) => {
      // @ts-ignore - Prisma model names are dynamic.
      await prisma[modelName].deleteMany()
    })
  )

  for (const modelName of clone(tablePriority.ordered).reverse()) {
    // @ts-ignore - Prisma model names are dynamic.
    await prisma[modelName].deleteMany()
  }

  logDebug('Dropped all records.')
}

/**
 * Get record from a table.
 *
 * @param tableName Table name.
 * @param id Record ID.
 * @returns Record data.
 */
export const getRecord = async (
  tableName: TableNames,
  id: string
): Promise<DatabaseRecord> => {
  logDebug('Getting record:', tableName, id)
  // @ts-ignore - Prisma model names are dynamic.
  return await prisma[tableName].findUnique({
    where: { id }
  })
}

/**
 * Get records from a table.
 *
 * @param tableName Table name.
 * @param ids Record IDs.
 * @returns Record data.
 */
export const getRecords = async (
  tableName: TableNames,
  ids: string[]
): Promise<DatabaseRecord[]> => {
  logDebug('Getting records:', tableName, ids)
  // @ts-ignore - Prisma model names are dynamic.
  return await prisma[tableName].findMany({
    where: {
      id: {
        in: ids
      }
    }
  })
}

/**
 * Apply records to the database.
 *
 * @param tableName Table name.
 * @param records Records to apply.
 */
export const applyRecords = async (
  tableName: TableNames,
  records: DatabaseRecord[]
) => {
  for (const record of records) {
    logDebug('Applying record to table:', tableName, 'Record:', record)
    // @ts-ignore - Prisma model names are dynamic.
    await prisma[tableName].upsert({
      where: { id: record.id },
      create: record,
      update: record
    })
  }
}

/**
 * Apply records from multiple tables to the database.
 *
 * @param records Records to apply.
 */
export const applyAllRecords = async (records: Records) => {
  for (const modelName of tablePriority.ordered) {
    logDebug('Applying records to table:', modelName)
    // @ts-ignore - Prisma model names are dynamic.
    if (records[modelName]) await applyRecords(modelName, records[modelName])
  }

  await Promise.all(
    tablePriority.unordererd.map(async (modelName) => {
      logDebug('Applying records to table:', modelName)
      // @ts-ignore - Prisma model names are dynamic.
      if (records[modelName]) await applyRecords(modelName, records[modelName])
    })
  )
}

/**
 * Delete a record from a table.
 *
 * @param tableName Table name.
 * @param id Record ID.
 */
export const deleteRecord = async (tableName: TableNames, id: string) => {
  logDebug('Deleting record:', tableName, id)
  // @ts-ignore - Prisma model names are dynamic.
  await prisma[tableName].delete({
    where: { id }
  })
}

/**
 * Get all prisma model names.
 */
const getAllModels = memoize<TableNamesList>(() => {
  const allProperties = Object.keys(prisma)
  return allProperties.filter(
    (property) => !property.startsWith('_')
  ) as TableNamesList
})

/**
 * Count the number of children in an object of arrays.
 *
 * @param obj Object of arrays.
 * @returns Number of children.
 */
const countRecords = (obj: { [key: string]: any[] }) => {
  let count = 0
  for (const key in obj) {
    count += obj[key].length
  }
  return count
}
