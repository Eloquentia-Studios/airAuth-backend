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
import clone from '../lib/clone.js'
import { isDirectory, isValidPath } from './validate.js'

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
 * Remote server configuration schema.
 */
export const remoteServer = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(100),
  sync: z.boolean().default(false)
})

// Export the remote server type.
export type RemoteServer = z.infer<typeof remoteServer>

/**
 * Websocket configuration schema.
 */
export const websocketConfiguration = z.object({
  enabled: z.boolean(),
  server: z.object({
    name: z.string().min(1).max(100),
    port: z.number().int().min(1).max(65535)
  }),
  ssl: z.boolean(),
  servers: z.array(remoteServer).max(2),
  tryConnectInterval: z.number().int().min(1).max(1440),
  connectOnStart: z.boolean().default(true)
})

export type WebsocketConfiguration = z.infer<typeof websocketConfiguration>

/**
 * Sync configuration schema.
 */
export const syncConfiguration = z.object({
  enabled: z.boolean(),
  fullSyncInterval: z.number().int().min(1).max(1440),
  secret: z.string().min(15).max(512)
})

export type SyncConfiguration = z.infer<typeof syncConfiguration>

/**
 * Export server configuration interface.
 */
export const serverConfiguration = z.object({
  backup: backupConfiguration,
  websocket: websocketConfiguration,
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

  writeConfigWithComments(path, defaultConfig)
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

  const config = parseJsonWithComments(readFileSync(configPath, 'utf-8'))
  const validatedConfig = serverConfiguration.safeParse(config)

  if (validatedConfig.success) {
    return validatedConfig.data
  } else {
    tryToRepairConfig(validatedConfig.error.issues, config, configPath)
  }
}

export const tryToRepairConfig = (
  issues: z.ZodIssue[],
  config: object,
  configPath: string
) => {
  throwErrorOnInvalidValueInConfig(issues, configPath)
  const repairedConfing = repairConfig(config, clone(defaultConfig))
  writeConfigWithComments(configPath, repairedConfing)
  console.warn(
    `Configuration file at '${configPath}' has been repaired, please check it!`
  )
  process.exit(1)
}

const throwErrorOnInvalidValueInConfig = (
  issues: z.ZodIssue[],
  configPath: string
) => {
  const requiredIssues = issues.filter((i) => i.message === 'Required')
  const otherIssues = issues.filter((i) => i.message !== 'Required')

  if (otherIssues.length > 0) {
    console.error(
      `Invalid value in configuration file at '${configPath}'.\n- `,
      otherIssues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n- ')
    )
    process.exit(1)
  }
}

const repairConfig = (config: any, newConfig: any) => {
  if (!newConfig) return config
  const keys = Object.keys(newConfig)
  keys.push(...Object.keys(config).filter((k) => !keys.includes(k)))

  for (const key of keys) {
    if (config[key]) {
      if (typeof config[key] === 'object')
        newConfig[key] = repairConfig(config[key], newConfig[key])
      else newConfig[key] = config[key]
    }
  }
  return newConfig
}

const writeConfigWithComments = (configPath: string, config: object) => {
  const json = stringifyJsonWithComments(config, defaultConfigComments)
  writeFileSync(configPath, json)
}
