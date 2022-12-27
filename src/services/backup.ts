import { type Backup } from '@prisma/client'
import { existsSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join as pathJoin } from 'path'
import serverConfig from '../global/configuration.js'
import logDebug from '../lib/logDebug.js'
import waitForDb from '../lib/waitForDb.js'
import type { Records } from '../types/Records.js'
import { hours } from './../global/time.js'
import { type BackupConfiguration } from './config.js'
import { symmetricEncrypt } from './encryption.js'
import prisma, { getAllRecords } from './prisma.js'
import { pathSafeDateTime } from './time.js'

let configuration: BackupConfiguration

/**
 * Initialize the backup service.
 */
export const initBackup = async () => {
  logDebug('Initializing backup service...')
  configuration = serverConfig.backup
  if (!configuration.enabled) return console.log('Backups are disabled.')
  planNextBackup()
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
const backup = async () => {
  if (waitForDb(backup)) return

  const rawData = await getAllRecords()
  const encryptedData = await encryptData(rawData)

  createBackupFolder()
  const filePath = createFilePath()
  await writeFile(filePath, encryptedData)

  await addBackupToDb(filePath)
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
const createFilePath = () => {
  const filename = `${pathSafeDateTime(new Date())}.bak.enc`
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
