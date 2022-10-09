import Prisma from '@prisma/client'
import type { RecordHashes, TableNames } from '../types/RecordHash.d'
import type { TableNamesList } from '../types/RecordHash.d'
import type DatabaseRecord from '../types/DatabaseRecord.d'

const prisma = new Prisma.PrismaClient()
export default prisma

/**
 * Get all record hashes for all models in prisma.
 *
 * @returns Record hashes.
 */
export const getAllRecordHashes = async () => {
  const modelNames = await getAllModels()
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

let modelNames: TableNamesList = []

/**
 * Get all prisma model names.
 */
const getAllModels = async (): Promise<TableNamesList> => {
  if (modelNames.length > 0) return modelNames
  const allProperties = Object.keys(prisma)
  modelNames = allProperties.filter(
    (property) => !property.startsWith('_')
  ) as TableNamesList
  return modelNames
}
