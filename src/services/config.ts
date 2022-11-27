import { existsSync, writeFileSync } from 'fs'
import { z } from 'zod'

// Define the default configuration.
const defaultConfig: ServerConfiguration = {
  sync: {
    enabled: false,
    server: {
      name: 'SERVER-NAME',
      port: 7070
    },
    servers: [
      {
        name: 'SECOND-SERVER-NAME',
        address: 'http://server.two:7070'
      }
    ],
    fullSyncInterval: 30,
    secret: 'THIS-SHOULD-BE-RANDOMLY-GENERATED',
    startDelay: 0,
    connectOnStart: true
  }
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
  servers: z.array(remoteServer).max(1),
  fullSyncInterval: z.number().int().min(0).max(1440), // 0 = disabled
  secret: z.string().min(15).max(512),
  startDelay: z.number().int().min(0).max(10000),
  connectOnStart: z.boolean()
})

// Export the sync configuration type.
export type SyncConfiguration = z.infer<typeof syncConfiguration>

/**
 * Export server configuration interface.
 */
export interface ServerConfiguration {
  sync: SyncConfiguration
}

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
}
