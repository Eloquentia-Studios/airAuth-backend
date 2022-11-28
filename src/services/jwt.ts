import type { User } from '@prisma/client'
import fs, { existsSync, mkdirSync, writeFileSync } from 'fs'
import jwt from 'jsonwebtoken'
import path from 'path'
import { generateECDSAKeyPair } from '../services/encryption.js'
import type TokenUserData from '../types/TokenData.d'

// Private and public keys.
let privateKey: string
let publicKey: string

/**
 * Load the private and public keys.
 */
export const loadKeys = async () => {
  // Key paths.
  const privateKeyPath = './config/pems/private.key'
  const publicKeyPath = './config/pems/public.key'

  // Check if the keys exist, otherwise generate them.
  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath))
    await generateKeys(privateKeyPath, publicKeyPath)

  // Load private and public keys.
  privateKey = fs.readFileSync('./config/pems/private.key', 'utf8')
  publicKey = fs.readFileSync('./config/pems/public.key', 'utf8')
}

/**
 * Generate a JWT token for a user.
 *
 * @param user User to create a token for.
 * @returns The JWT token.
 */
export const generateToken = (user: User): string => {
  // Check if the keys are loaded.
  keysLoaded()

  // Create a new JWT token.
  const token = jwt.sign(
    {
      id: user.id
    },
    privateKey,
    {
      algorithm: 'ES512',
      expiresIn: process.env.JWT_EXPIRATION || '7d'
    }
  )

  return token
}

/**
 * Verify and decode a JWT token.
 *
 * @param token Token to verify.
 * @returns Token data if the token is valid, null otherwise.
 */
export const verifyToken = (token: string): TokenUserData | null => {
  // Check if the keys are loaded.
  keysLoaded()

  try {
    // Verify the token.
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['ES512']
    }) as TokenUserData

    // Return the user if the token is valid.
    return decoded
  } catch (error) {
    // Return null if the token is invalid.
    return null
  }
}

/**
 * Generate private and public keys for JWT signing.
 *
 * @param privateKeyPath Path to write the private key to.
 * @param publicKeyPath Path to write the public key to.
 */
const generateKeys = async (privateKeyPath: string, publicKeyPath: string) => {
  // Print information about key generation.
  printKeyGenerationInfo()

  // Generate a new key pair.
  const keys = await generateECDSAKeyPair()

  // Check if directory exists, otherwise create it.
  const dir = path.dirname(privateKeyPath)
  if (!existsSync(dir)) mkdirSync(dir)

  // Write the keys to the given paths.
  writeFileSync(privateKeyPath, keys.privateKey)
  writeFileSync(publicKeyPath, keys.publicKey)

  // Print a success message.
  printKeyGenerationSuccess()
}

/**
 * Print information about key generation.
 */
const printKeyGenerationInfo = () => {
  console.log('Generating new keys for user authentication...')
  console.log('Make sure to keep the private key safe!')
  console.log(
    'IMPORTANT: If you lose the private key, you will not be able to verify user tokens!'
  )
  console.log(
    'If you intend to use server sync, you will have to use the same keys on all servers!'
  )
}

/**
 * Print a success message after key generation.
 */
const printKeyGenerationSuccess = () => {
  console.log('Keys generated successfully!')
}

/**
 * Check if the keys are loaded.
 */
const keysLoaded = () => {
  if (!privateKey || !publicKey) throw new Error('Keys not loaded')
}
