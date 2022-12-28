import { type Backup } from '@prisma/client'
import { existsSync, lstatSync, mkdirSync } from 'fs'
import { readFile, unlink, writeFile } from 'fs/promises'
import { join as pathJoin } from 'path'
import serverConfig from '../global/configuration.js'
import { setDbWritesPaused } from '../global/pauseTraffic.js'
import logDebug from '../lib/logDebug.js'
import waitForDb from '../lib/waitForDb.js'
import type { Records } from '../types/Records.js'
import { hours } from './../global/time.js'
import { type BackupConfiguration } from './config.js'
import { symmetricDecrypt, symmetricEncrypt } from './encryption.js'
import prisma, {
  applyAllRecords,
  dropAllRecords,
  getAllRecords
} from './prisma.js'
import { pathSafeDateTime } from './time.js'

let configuration: BackupConfiguration

/**
 * Initialize the backup service.
 */
export const initBackup = async () => {
  logDebug('Initializing backup service...')
  if (!configuration.enabled) return console.log('Backups are disabled.')
  planNextBackup()
}

/**
 * Restore the database from the a backup.
 *
 * @returns True if the database was restored, false if it was not.
 */
export const restoreBackup = async (): Promise<boolean> => {
  configuration = serverConfig.backup
  const restoreBackupName = process.env.RESTORE_BACKUP
  logDebug('Restore backup name:', restoreBackupName)
  if (!restoreBackupName) return false

  const restoreBackupPath = pathJoin(configuration.path, restoreBackupName)
  if (!backupFileExists(restoreBackupPath)) {
    console.error('Backup file does not exist.')
    return true
  }

  await createRestoreBackup()
  await cleanDatabase()
  await restoreFromFile(restoreBackupPath)

  console.info('Database restored from', restoreBackupName)
  return true
}

/**
 * Check if a backup file exists.
 *
 * @param path The path to the backup file.
 * @returns True if the file exists, false if it does not.
 */
const backupFileExists = (path: string) => {
  if (!existsSync(path)) return false
  if (!lstatSync(path).isFile()) return false
  return true
}

/**
 * Create a backup before restoring.
 */
const createRestoreBackup = async () => {
  console.info(`Creating backup before restoring...`)
  await backup('restore ')
}

/**
 * Drop all records from the database.
 */
const cleanDatabase = async () => {
  console.info(`Cleaning database...`)
  await dropAllRecords()
}

/**
 * Restore the database from a backup file.
 *
 * @param path The path to the backup file.
 */
const restoreFromFile = async (path: string) => {
  console.info(`Restoring backup from file '${path}'...`)
  const encryptedBackupData = await readFile(path)
  const backupData = await decryptData(encryptedBackupData.toString())
  await applyAllRecords(backupData)
}

/**
 * Plan the next backup.
 */
const planNextBackup = async () => {
  const lastBackup = await getLastBackup()
  const timeUntilNextBackup = calculateTimeUntilNextBackup(lastBackup)
  logDebug(`Next backup in ${timeUntilNextBackup}ms.`)
  setTimeout(backup, timeUntilNextBackup)
}

/**
 * Calculate the time until the next backup should be made.
 *
 * @param lastBackup The last backup or null if there is no backup.
 * @returns The time until the next backup should be made.
 */
const calculateTimeUntilNextBackup = (lastBackup: Backup | null) => {
  if (!lastBackup) return 1

  const timeSinceLastBackup = Date.now() - lastBackup.createdAt.getTime()
  logDebug(`Time since last backup: ${timeSinceLastBackup}ms.`)
  let timeUntilNextBackup = hours * configuration.interval - timeSinceLastBackup
  if (timeUntilNextBackup <= 0) timeUntilNextBackup = 1

  return timeUntilNextBackup
}

/**
 * Create a backup.
 */
const backup = async (prefix = 'backup ') => {
  await waitForDb('backup')
  setDbWritesPaused(true)

  const filePath = await createBackup(prefix)
  await dbBackupComplete(filePath)

  await cleanBackups()
  planNextBackup()
}

/**
 * Create and save a backup to file and database.
 *
 * @param prefix The prefix to use for the backup file name.
 * @returns The file path of the backup.
 */
const createBackup = async (prefix: string): Promise<string> => {
  logDebug('Creating backup...')
  const rawData = await getAllRecords()
  const encryptedData = await encryptData(rawData)
  return await writeBackup(encryptedData, prefix)
}

/**
 * Write the backup to file.
 *
 * @param encryptedData Encrypted data to write to file.
 * @param prefix The prefix to use for the backup file name.
 * @returns The file path of the backup.
 */
const writeBackup = async (encryptedData: string, prefix: string) => {
  createBackupFolder()
  const filePath = createFilePath(prefix)
  await writeFile(filePath, encryptedData)
  return filePath
}

/**
 * Add the backup to the database and resume database writes.
 *
 * @param filePath The file path of the backup.
 */
const dbBackupComplete = async (filePath: string) => {
  logDebug('Adding backup to database...')
  await addBackupToDb(filePath)
  setDbWritesPaused(false)
}

/**
 * Encrypt the data.
 *
 * @param data The data to encrypt.
 * @returns The encrypted data.
 */
const encryptData = async (data: Records) => {
  logDebug('Encrypting data...')
  const json = JSON.stringify(data)
  return await symmetricEncrypt(json, configuration.secret)
}

/**
 * Decrypt the data.
 *
 * @param data The data to decrypt.
 * @returns The decrypted data.
 */
const decryptData = async (data: string) => {
  logDebug('Decrypting data...')
  const json = await symmetricDecrypt(data, configuration.secret)
  return JSON.parse(json)
}

/**
 * Create backup folder if it does not exist.
 */
const createBackupFolder = () => {
  if (!existsSync(configuration.path)) {
    logDebug(`Creating backup folder: ${configuration.path}`)
    mkdirSync(configuration.path)
  }
}

/**
 * Create file path for new backup.
 *
 * @returns The file path for the new backup.
 */
const createFilePath = (prefix: string) => {
  const filename = `${prefix} ${pathSafeDateTime(new Date())}.bak.enc`
  const backupFilePath = pathJoin(configuration.path, filename)
  logDebug(`Creating backup file: ${backupFilePath}`)
  return backupFilePath
}

/**
 * Add a backup to the database.
 *
 * @param filename The filename of the backup.
 */
const addBackupToDb = async (filename: string) => {
  logDebug(`Adding backup to database: ${filename}`)
  await prisma.backup.create({
    data: {
      filename
    }
  })
}

/**
 * Clean up old backups from the database and file system.
 */
const cleanBackups = async () => {
  if (configuration.keep === 0) return
  const oldBackups = await getOldBackups()
  console.info(
    `Cleaning ${oldBackups.length} old backup${
      oldBackups.length > 1 ? 's' : ''
    }...`
  )
  await Promise.all(oldBackups.map(deleteBackup))
}

/**
 * Delete a backup from the database and file system.
 *
 * @param backup The backup to delete.
 */
const deleteBackup = async (backup: Backup) => {
  await deleteBackupFromDb(backup)
  await deleteBackupFromFileSystem(backup)
}

/**
 * Get the last backup from the database.
 */
const getLastBackup = async () => {
  logDebug('Getting last backup from database...')
  return await prisma.backup.findFirst({
    orderBy: {
      createdAt: 'desc'
    }
  })
}

/**
 * Get old backups from the database.
 *
 * @returns The old backups.
 */
const getOldBackups = async () => {
  logDebug('Getting backups from database...')
  return await prisma.backup.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    skip: configuration.keep
  })
}

/**
 * Delete a backup from the database.
 *
 * @param id The id of the backup to delete.
 */
const deleteBackupFromDb = async (backup: Backup) => {
  logDebug(`Deleting backup from db: ${backup.filename}`)
  await prisma.backup.delete({
    where: {
      id: backup.id
    }
  })
}

/**
 * Delete a backup file.
 *
 * @param backup The backup to delete.
 */
const deleteBackupFromFileSystem = async (backup: Backup) => {
  if (existsSync(backup.filename)) {
    logDebug(`Deleting backup file: ${backup.filename}`)
    await unlink(backup.filename)
  }
}
