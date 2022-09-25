import { z } from 'zod'

export const remoteServer = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(100)
})

export type RemoteServer = z.infer<typeof remoteServer>

// TODO: Add custom error messages.
export const syncConfiguration = z.object({
  enabled: z.boolean(),
  server: z.object({
    name: z.string().min(1).max(100),
    port: z.number().int().min(1).max(65535)
  }),
  servers: z.array(remoteServer),
  secret: z.string().min(15).max(512),
  startDelay: z.number().int().min(0).max(10000),
  connectOnStart: z.boolean()
})

export type SyncConfiguration = z.infer<typeof syncConfiguration>
