# RSA Encryption Keys

This is the directory where you should place the private and public key files. If you are not syncing with another
server you should generate a new key-pair using the 'generate_keys.sh' script in the root. These keys are used
when generate the JWT tokens given to clients when authenticating.

## Synced servers

If you have server sync enabled between two or more servers you need to make sure the servers have the same
key files in order to allow seamless transition between servers in case of a crash. **If the keys do not match
the servers will not connect!**
