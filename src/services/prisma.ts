import Prisma from '@prisma/client'
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
export const getAllRecords = async () => {
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
