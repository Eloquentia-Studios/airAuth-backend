export interface SyncConfiguration {
  enabled: boolean
  server: Server
  servers: RemoteServer[]
  secret: string
}

interface Server {
  name: string
  listen: string
}

interface RemoteServer {
  name: string
  address: string
}
