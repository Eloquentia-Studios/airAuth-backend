import { type Backup } from '@prisma/client'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
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
export const restoreBackup = async () => {
  configuration = serverConfig.backup

  // Check if a backup should be restored.
  const restoreBackup = process.env.RESTORE_BACKUP
  if (!restoreBackup) return false
  if (!existsSync(pathJoin(configuration.path, restoreBackup))) return false

  console.log(`Creating backup before restoring...`)
  await backup('restore ')

  console.log(`Dropping all tables...`)
  await dropAllRecords()

  console.log(`Restoring backup from file '${restoreBackup}'...`)
  const backupPath = pathJoin(configuration.path, restoreBackup)
  const encryptedBackupData = await readFile(backupPath)
  const backupData = await decryptData(encryptedBackupData.toString())
  await applyAllRecords(backupData)

  return true
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

  const rawData = await getAllRecords()
  const encryptedData = await encryptData(rawData)

  createBackupFolder()
  const filePath = createFilePath(prefix)
  await writeFile(filePath, encryptedData)

  await addBackupToDb(filePath)
  setDbWritesPaused(false)
  planNextBackup()
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
