import fs from 'fs'
import { z } from 'zod'

let configuration: SyncConfiguration | null = null

// TODO: Add custom error messages.
const SyncConfiguration = z.object({
  enabled: z.boolean(),
  server: z.object({
    name: z.string().min(1).max(100),
    listen: z.string().min(1).max(100)
  }),
  servers: z.array(
    z.object({
      name: z.string().min(1).max(100),
      address: z.string().min(1).max(100)
    })
  ),
  secret: z.string().min(15).max(512)
})

export type SyncConfiguration = z.infer<typeof SyncConfiguration>

/**
 * Initialize the sync service
 */
export const initSync = () => {
  const configPath = process.env.CONFIG_PATH || './config/config.json'
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  configuration = config.sync as SyncConfiguration

  // Check configuration validity.
  const result = SyncConfiguration.safeParse(configuration)
  if (!result.success) {
    console.error(result.error)
    throw new Error('Sync configuration is invalid')
  }

  // Check if the sync service is enabled.
  if (!configuration.enabled) {
    console.log('Sync service is disabled.')
    return
  } else {
    console.log('Sync service is enabled.')
    console.log('Server name: ' + configuration.server.name)
    console.log('Listeing on: ' + configuration.server.listen)
  }
}
