import { existsSync, readFileSync, writeFileSync } from 'fs'
import { z } from 'zod'
import { isDirectory, isValidPath } from './validate.js'

// Define the default configuration.
const defaultConfig: ServerConfiguration = {
  backup: {
    enabled: false,
    interval: 72,
    path: './backups/',
    keep: 10,
    secret: 'THIS-SHOULD-BE-RANDOMLY-GENERATED'
  },
  sync: {
    enabled: false,
    server: {
      name: 'SERVER-NAME',
      port: 7070
    },
    servers: [
      {
        name: 'SECOND-SERVER-NAME',
        address: 'server.two:7070'
      }
    ],
    ssl: false,
    fullSyncInterval: 30,
    secret: 'THIS-SHOULD-BE-RANDOMLY-GENERATED',
    startDelay: 0,
    connectOnStart: true
  },
  debug: false
}

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
  startDelay: z.number().int().min(0).max(10000),
  connectOnStart: z.boolean()
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
    keep: z.number().int().min(1),
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
  backup: backupConfiguration,
  debug: z.boolean().default(false)
})

export type ServerConfiguration = z.infer<typeof serverConfiguration>

/**
 * Write the default configuration file.
 *
 * @param path Path to write the file to.
 */
export const writeDefaultConfig = (path: string) => {
  // Check if the file already exists.
  if (existsSync(path)) return

  // Write the file.
  writeFileSync(path, JSON.stringify(defaultConfig, null, 2))
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
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  const validatedConfig = serverConfiguration.safeParse(config)

  if (validatedConfig.success) {
    return validatedConfig.data
  } else {
    throw new Error(
      'Configuration file is invalid: ' + validatedConfig.error.message
    )
  }
}
