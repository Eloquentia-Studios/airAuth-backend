# Server Configuration

The server configuration is usually stored in `config.json`.

## Backups

All backup configuration is set under the `backup` key in the configuration file. The configurations possible are:

```json
"backup": {
  "enabled": false, // Enables or disables the database backup service. DEFAULT: false
  "interval": 72, // The time beteween creating backups. UNIT: hours DEFAULT: 72
  "path": "./backups/", // Path to directory containing backups. DEFAULT: ./backups/
  "keep": 10, // Number of backups to keep. Oldest will be deleted first. If set to 0, none will get deleted. DEFAULT: 10
  "secret": "THIS-SHOULD-BE-RANDOMLY-GENERATED" // A secret to encrypt the backups with. This should be generated using a tool such as: https://www.random.org/strings/?num=5&len=20&digits=on&upperalpha=on&loweralpha=on&format=plain
}
```

## Server synchronization

All server synchronization configuration is set under the `sync` key in the configuration file. The configurations
possible are:

```json
"sync": {
  "enabled": false, // Enables or disables the server syncronization service. DEFAULT: false
  "server": {
    "name": "SERVER-NAME", // Name of the local server. DEFAULT: SERVER-NAME
    "port": 7070 // Port to use for websocket server for connection between servers. DEFAULT: 7070
  },
  "servers": [ // List of remote servers to synchronize with.
    {
      "name": "SECOND-SERVER", // Name of the server to synchronize with. DEFAULT: SECOND-SERVER
      "address": "server.two:7070" // Websocket connection address. DEFAULT: http://server.two:7070
    }
  ],
  "ssl": false, // This indicates if websocket connections should use SSL by default. This is overridden if either `ws://` or `wss://` is used in the server address. DEFAULT: false
  "fullSyncInterval": 30, // The time between full database syncs to run during runtime. Zero to disable. UNIT: min DEFAULT: 30
  "secret": "THIS-SHOULD-BE-RANDOMLY-GENERATED", // A secret which should be shared between all servers. This should be generated using a tool such as: https://www.random.org/strings/?num=5&len=20&digits=on&upperalpha=on&loweralpha=on&format=plain
  "startDelay": 0, // Delays the start of the synchronization service. Used for development. UNIT: ms DEFAULT: 0
  "connectOnStart": true // Wheather or not the server should try to connect to remote servers on start. Used for development. This should be left on 'true' in almost all cases. DEFAULT: true
}
```

## Debug mode

By setting `"debug": true` in the server configuration it enables more logging during runtime.
