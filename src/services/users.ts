import type { KeyPair, User } from '@prisma/client'
import argon2 from 'argon2'
import createUpdatedPrismaObject from '../lib/createUpdatedPrismaObject.js'
import hashObject from '../lib/hashObject.js'
import logDebug from '../lib/logDebug.js'
import type { RecordHash } from '../types/RecordHash.d'
import type UserUpdates from '../types/UserUpdates.d'
import { generateEncryptedKeyPair } from './encryption.js'
import prisma from './prisma.js'
import { updateRecord } from './sync.js'

/**
 * Create a new user.
 *
 * @param username Username to check.
 * @param email Email to check.
 * @param phonenumber Phone number to check.
 * @param password Password to check.
 *
 * @returns True if the user information is valid.
 * @throws Error if the user could not be created.
 */
export const createUser = async (
  username: string,
  email: string,
  password: string,
  phonenumber?: string
): Promise<User & { keyPair: KeyPair }> => {
  logDebug('Creating user:', username, email, phonenumber)
  // Check phonenumber and hash password.
  phonenumber = phonenumber || undefined // TODO: Figure out a better way to do this.
  const passwordHash = await hashPassword(password)

  // Generate a keypair for the user.
  const keypair = await generateEncryptedKeyPair(password)

  // Create user object.
  const userObj = {
    username,
    email,
    phonenumber,
    passwordHash
  }

  // Create the user.
  const user = (await prisma.user.create({
    data: {
      ...userObj,
      hash: hashObject(userObj),
      keyPair: {
        create: {
          ...keypair,
          hash: hashObject(keypair)
        }
      }
    },
    include: {
      keyPair: true
    }
  })) as User & { keyPair: KeyPair }

  // Send to remote servers.
  await updateRecord('user', user)

  return user
}

/**
 * Get a user by their identifier.
 *
 * @param identifier The user's identifier.
 * @returns The user or null if the user does not exist.
 */
export const getUser = async (
  identifier: string
): Promise<(User & { keyPair: KeyPair }) | null> => {
  logDebug('Getting user:', identifier)
  const user = (await prisma.user.findFirst({
    where: {
      OR: [
        { id: identifier },
        { username: identifier },
        { email: identifier },
        { phonenumber: identifier }
      ]
    },
    include: {
      keyPair: true
    }
  })) as User & { keyPair: KeyPair }

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
): Promise<(User & { keyPair: KeyPair }) | null> => {
  logDebug('Validating user:', identifier, 'with a password')

  const user = await getUser(identifier)
  if (!user) return null

  // Check if the password is correct.
  const passwordCorrect = await verifyPassword(password, user.passwordHash)
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
  logDebug('Deleting user:', id)
  return await prisma.user.delete({
    where: {
      id
    }
  })
}

/**
 * Update a users data.
 *
 * @param id ID of the user to update.
 * @param updates Updates to apply to the user.
 * @returns The updated user.
 */
export const updateUser = async (
  id: string,
  updates: UserUpdates
): Promise<User> => {
  logDebug('Updating user:', id, { ...updates, password: '***' })

  // Hash password if it is set.
  if (updates.password) {
    updates.passwordHash = await hashPassword(updates.password)
    delete updates.password
  }

  // Generate the updated user data.
  const newUserData = createUpdatedPrismaObject(await getUser(id), updates)

  // Update user.
  const user = await prisma.user.update({
    where: {
      id
    },
    data: {
      ...newUserData,
      hash: hashObject(newUserData)
    }
  })

  // Send to remote servers.
  updateRecord('user', user)

  return user
}

/**
 * Get hashes for all the records of all the users.
 *
 * @returns Array of all user uuids and their corresponding hashes.
 */
export const getUserHashes = async (): Promise<RecordHash[]> => {
  // Get all users with hashes.
  return await prisma.user.findMany({
    select: {
      id: true,
      hash: true
    }
  })
}

/**
 * Get hashes for all the records of all the keypairs.
 *
 * @returns Array of all keypair uuids and their corresponding hashes.
 */
export const getKeypairHashes = async (): Promise<RecordHash[]> => {
  // Get all keypairs with hashes.
  return await prisma.keyPair.findMany({
    select: {
      id: true,
      hash: true
    }
  })
}

/**
 * Hash a password.
 *
 * @param password Password to hash.
 * @returns Hashed password.
 */
const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password)
}

/**
 * Verify a password.
 *
 * @param password Password to check.
 * @param hash Hashed password.
 * @returns True if the password is correct.
 */
const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await argon2.verify(hash, password)
}
