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

## Debug mode

By setting `"debug": true` in the server configuration it enables more logging during runtime.
