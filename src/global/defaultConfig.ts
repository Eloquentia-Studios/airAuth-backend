import type { ServerConfigurationInput } from '../services/config.js'

export const defaultConfig: ServerConfigurationInput = {
  backup: {
    enabled: false,
    interval: 72,
    path: './backups/',
    keep: 10,
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
  debug:
    'By setting to true in the server configuration it enables more logging during runtime.'
}
