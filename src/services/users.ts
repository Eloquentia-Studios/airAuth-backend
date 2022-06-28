import type { User } from '@prisma/client'
import type UserUpdates from '../types/UserUpdates.d'
import type UserWithKeypair from '../types/UserWithKeypair.d'
import { generateKeyPair, symmetricEncrypt } from './encryption.js'
import { hashPassword, verifyPassword } from './password.js'
import prisma from './prisma.js'

/**
 * Create a new user.
 *
 * @param username Username to check.
 * @param email Email to check.
 * @param phonenumber Phone number to check.
 * @param password Password to check.
 * @returns True if the user information is valid.
 * @throws Error if the user could not be created.
 */
export const createUser = async (
  username: string,
  email: string,
  password: string,
  phonenumber?: string
): Promise<User> => {
  // Hash the password.
  const passwordHash = await hashPassword(password)

  // Check if the phonenumber is not set.
  phonenumber = phonenumber || undefined

  // Generate the users keypair.
  const keyPair = await generateKeyPair()

  // Encrypt the users private key.
  const privateKey = await symmetricEncrypt(keyPair.private, password)

  // Create the user.
  const user = await prisma.user.create({
    data: {
      username,
      email,
      phonenumber,
      passwordHash,
      keyPair: {
        create: {
          publicKey: keyPair.public,
          privateKey: privateKey
        }
      }
    }
  })
  return user
}

export const getUser = async (
  identifier: string
): Promise<UserWithKeypair | null> => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: identifier },
        { username: identifier },
        { email: identifier },
        { phonenumber: identifier }
      ]
    },
    include: { keyPair: true }
  })
  return user
}

/**
 * Check if an identifier corresponds to a user with a given password.
 *
 * @param identifier Username, email or phonenumber to check.
 * @param password Password to check.
 * @returns The user if the credentials are valid, null otherwise.
 */
export const validateUser = async (
  identifier: string,
  password: string
): Promise<UserWithKeypair | null> => {
  // Get the user.
  const user = await getUser(identifier)

  // Check if the user exists.
  if (!user) return null

  // Check if the password is correct.
  const passwordCorrect = await verifyPassword(password, user.passwordHash)

  // Return null if the password is incorrect, otherwise return the user.
  if (!passwordCorrect) return null

  return user
}

/**
 * Delete a user.
 *
 * @param id ID of the user to delete.
 * @returns The user if the user could be deleted.
 */
export const deleteUser = async (id: string): Promise<User> => {
  return await prisma.user.delete({
    where: {
      id
    }
  })
}

export const updateUser = async (
  id: string,
  updates: UserUpdates
): Promise<User> => {
  // Hash password if it is set.
  if (updates.password) {
    updates.passwordHash = await hashPassword(updates.password)
    delete updates.password
  }

  // Update user.
  return await prisma.user.update({
    where: {
      id
    },
    data: updates
  })
}
