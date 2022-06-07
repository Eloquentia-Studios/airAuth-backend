import argon2 from 'argon2'

/**
 * Hash a password.
 *
 * @param password Password to hash.
 * @returns Hashed password.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password)
}

/**
 * Verify a password.
 *
 * @param password Password to check.
 * @param hash Hashed password.
 * @returns True if the password is correct.
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await argon2.verify(hash, password)
}
