import { generateECDSAKeyPair } from '../services/encryption.js'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

/**
 * Generate private and public keys for JWT signing.
 *
 * @param privateKeyPath Path to write the private key to.
 * @param publicKeyPath Path to write the public key to.
 */
const generateKeys = async (privateKeyPath: string, publicKeyPath: string) => {
  // Print disclaimer.
  console.log('Generating new keys for user authentication...')
  console.log('Make sure to keep the private key safe!')
  console.log(
    'IMPORTANT: If you lose the private key, you will not be able to verify user tokens!'
  )
  console.log(
    'If you intend to use server sync, you will have to use the same keys on all servers!'
  )

  // Generate a new key pair.
  const keys = await generateECDSAKeyPair()

  // Check if directory exists, otherwise create it.
  const dir = path.dirname(privateKeyPath)
  if (!existsSync(dir)) mkdirSync(dir)

  // Write the keys to the given paths.
  writeFileSync(privateKeyPath, keys.privateKey)
  writeFileSync(publicKeyPath, keys.publicKey)

  // Print success message.
  console.log('Keys generated successfully!')
}

export default generateKeys
