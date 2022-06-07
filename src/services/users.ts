import type { User } from '@prisma/client'
import { hashPassword } from './password.js'
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

  // Create the user.
  const user = await prisma.user.create({
    data: {
      username,
      email,
      phonenumber,
      passwordHash
    }
  })
  return user
}
