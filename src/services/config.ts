import {
  parseJsonWithComments,
  stringifyJsonWithComments
} from '@eloquentiastudios/commentable-json'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { z } from 'zod'
import {
  defaultConfig,
  defaultConfigComments
} from '../global/defaultConfig.js'
import { isDirectory, isValidPath } from './validate.js'

/**
 * Remote server configuration schema.
 */
export const remoteServer = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(100)
})

// Export the remote server type.
export type RemoteServer = z.infer<typeof remoteServer>

// TODO: Add custom error messages.
/**
 * Sync configuration schema.
 */
export const syncConfiguration = z.object({
  enabled: z.boolean(),
  server: z.object({
    name: z.string().min(1).max(100),
    port: z.number().int().min(1).max(65535)
  }),
  ssl: z.boolean(),
  servers: z.array(remoteServer).max(1),
  fullSyncInterval: z.number().int().min(1).max(1440),
  secret: z.string().min(15).max(512),
  connectOnStart: z.boolean().default(true)
})

export type SyncConfiguration = z.infer<typeof syncConfiguration>

/**
 * Backup configuration schema.
 */
const pathIsValid = (data: { enabled: boolean; path: string }): boolean =>
  !data.enabled || isValidPath(data.path)
const pathIsNotFile = (data: { enabled: boolean; path: string }): boolean =>
  !data.enabled || isDirectory(data.path)

export const backupConfiguration = z
  .object({
    enabled: z.boolean(),
    interval: z.number().int().min(1),
    path: z.string().trim(),
    keep: z.number().int().min(0),
    secret: z.string().min(15).max(512)
  })
  .refine(pathIsValid, {
    message: 'Backup path does not look like a valid path.'
  })
  .refine(pathIsNotFile, { message: 'Backup path cannot be a file!' })

export type BackupConfiguration = z.infer<typeof backupConfiguration>

/**
 * Export server configuration interface.
 */
export const serverConfiguration = z.object({
  backup: backupConfiguration,
  sync: syncConfiguration,
  debug: z.boolean().default(false)
})

export type ServerConfiguration = z.infer<typeof serverConfiguration>
export type ServerConfigurationInput = z.input<typeof serverConfiguration>

/**
 * Write the default configuration file.
 *
 * @param path Path to write the file to.
 */
export const writeDefaultConfig = (path: string) => {
  // Check if the file already exists.
  if (existsSync(path)) return

  // Write the file.
  const json = stringifyJsonWithComments(defaultConfig, defaultConfigComments)
  writeFileSync(path, json)
  console.log('Default configuration file written to:', path)
}

/**
 * Read the configuration file.
 *
 * @returns Configuration object.
 */
export const readConfig = () => {
  // Check if the file exists.
  const configPath = process.env.CONFIG_PATH || './config/config.json'
  if (!existsSync(configPath))
    throw new Error(`Configuration file not found at '${configPath}'`)

  // Read the file.
  const config = parseJsonWithComments(readFileSync(configPath, 'utf-8'))

  const validatedConfig = serverConfiguration.safeParse(config)

  if (validatedConfig.success) {
    return validatedConfig.data
  } else {
    throw new Error(
      'Configuration file is invalid: ' + validatedConfig.error.message
    )
  }
}
