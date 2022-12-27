import { type Backup } from '@prisma/client'
import serverConfig from '../global/configuration.js'
import logDebug from '../lib/logDebug.js'
import waitForDb from '../lib/waitForDb.js'
import { hours } from './../global/time.js'
import { type BackupConfiguration } from './config.js'
import prisma from './prisma.js'

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

  console.log('Backing up...')
  await addBackupToDb('test')
  planNextBackup()
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