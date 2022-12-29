import type { ServerConfigurationInput } from '../services/config.js'

export const defaultConfig: ServerConfigurationInput = {
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
    tryConnectInterval: 5,
    secret: 'THIS-SHOULD-BE-RANDOMLY-GENERATED'
  },
  debug: false
}

export const defaultConfigComments = {
  _: 'AirAuth Server Configuration',
  backup: {
    _: 'Backup configuration.',
    enabled: 'Enables or disables the database backup service. DEFAULT: false',
    interval: 'The time beteween creating backups. UNIT: hours DEFAULT: 72',
    path: 'Path to directory containing backups. DEFAULT: ./backups/',
    keep: 'Number of backups to keep. Oldest will be deleted first. If set to 0, none will get deleted. DEFAULT: 10',
    secret:
      'A secret to encrypt the backups with. This should be generated using a tool such as: https://www.random.org/strings/?num=5&len=20&digits=on&upperalpha=on&loweralpha=on&format=plain'
  },
  sync: {
    _: 'Synchronization configuration.',
    enabled:
      'Enables or disables the server syncronization service. DEFAULT: false',
    server: {
      _: 'Name of the local server. DEFAULT: SERVER-NAME',
      name: 'Name of the local server. DEFAULT: SERVER-NAME',
      port: 'Port to use for websocket server for connection between servers. DEFAULT: 7070'
    },
    servers: {
      _: 'List of remote servers to synchronize with. Currently only supports one server.',
      0: {
        name: 'Name of the server to synchronize with. DEFAULT: SECOND-SERVER',
        address: 'Websocket connection address. DEFAULT: http://server.two:7070'
      }
    },
    ssl: 'This indicates if websocket connections should use SSL by default. This is overridden if either `ws://` or `wss://` is used in the server address. DEFAULT: false',
    fullSyncInterval:
      'The time between full database syncs to run during runtime. Zero to disable. UNIT: min DEFAULT: 30',
    tryConnectInterval:
      'The time between attempts to connect to remote servers. UNIT: min DEFAULT: 5',
    secret:
      'A secret which should be shared between all servers. This should be generated using a tool such as: https://www.random.org/strings/?num=5&len=20&digits=on&upperalpha=on&loweralpha=on&format=plain'
  },
  debug:
    'By setting to true in the server configuration it enables more logging during runtime.'
}
