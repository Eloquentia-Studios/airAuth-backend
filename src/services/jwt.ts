import type { User } from '@prisma/client'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import type TokenData from '../types/TokenData.d'

// Load private and public keys.
const privateKey = fs.readFileSync('./config/pems/private.key', 'utf8')
const publicKey = fs.readFileSync('./config/pems/public.key', 'utf8')

/**
 * Generate a JWT token for a user.
 *
 * @param user User to create a token for.
 * @returns The JWT token.
 */
export const generateToken = (user: User): string => {
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
export const verifyToken = (token: string): TokenData | null => {
  try {
    // Verify the token.
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['ES512']
    }) as TokenData

    // Return the user if the token is valid.
    return decoded
  } catch (error) {
    // Return null if the token is invalid.
    return null
  }
}
