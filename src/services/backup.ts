import { type Backup } from '@prisma/client'
import serverConfig from '../global/configuration.js'
import logDebug from '../lib/logDebug.js'
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
  const timeUntil = calculateTimeUntilNextBackup(lastBackup)
  logDebug(`Next backup in ${timeUntil}ms.`)
  setTimeout(() => {
    backup()
    planNextBackup()
  }, timeUntil)
}

/**
 * Calculate the time until the next backup should be made.
 *
 * @param lastBackup The last backup or null if there is no backup.
 * @returns The time until the next backup should be made.
 */
const calculateTimeUntilNextBackup = (lastBackup: Backup | null) => {
  if (!lastBackup) return 1

  const timeSince = Date.now() - lastBackup.createdAt.getTime()
  logDebug(`Time since last backup: ${timeSince}ms.`)
  let timeUntil = hours * configuration.interval - timeSince
  if (timeUntil <= 0) timeUntil = 1

  return timeUntil
}

const backup = () => {
  console.log('Backing up...')
  addBackupToDb('test')
}

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
