import type { User } from '@prisma/client'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import generateKeys from '../lib/generateKeys.js'
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
  // Verify that the keys are loaded.
  keysLoaded()

  // Create a new JWT token.
  const token = jwt.sign(
    {
      id: user.id
    },
    privateKey,
    {
      algorithm: 'ES512',
      expiresIn: '7d'
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
  try {
    // Verify that the keys are loaded.
    keysLoaded()

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
 * Verify that the keys are loaded.
 *
 * @throws Error if the keys are not loaded.
 */
const keysLoaded = () => {
  if (!privateKey || !publicKey) throw new Error('Keys not loaded')
}
