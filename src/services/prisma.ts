import Prisma from '@prisma/client'
import type DatabaseRecord from '../types/DatabaseRecord.d'
import type {
  RecordHashes,
  TableNames,
  TableNamesList
} from '../types/RecordHash.d'
import memoize from './../lib/memoize.js'

const prisma = new Prisma.PrismaClient()
export default prisma

/**
 * Get all record hashes for all models in prisma.
 *
 * @returns Record hashes.
 */
export const getAllRecordHashes = async () => {
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

  return recordHashes
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
