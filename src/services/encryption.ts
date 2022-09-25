import crypto from 'crypto'
import type KeyPair from '../types/KeyPair.d'

/**
 * Generate a random RSA key pair.
 *
 * @returns Private and public key as a KeyPair object.
 */
export const generateKeyPair = async (): Promise<KeyPair> => {
  const keys = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })

  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey
  }
}

/**
 * Generates a random RSA key pair and encrypts the private key with the given key.
 *
 * @param key The key to encrypt the private key with.
 * @returns Encrypted private key and plain public key as a KeyPair object.
 */
export const generateEncryptedKeyPair = async (
  key: string
): Promise<KeyPair> => {
  const { privateKey, publicKey } = await generateKeyPair()

  return {
    privateKey: await symmetricEncrypt(privateKey, key),
    publicKey
  }
}

/**
 * Encrypt a string symmentrically using a key.
 *
 * @param data Data to encrypt.
 * @param key Key to use for encryption.
 * @returns Encrypted data.
 */
export const symmetricEncrypt = async (data: any, key: string) => {
  if (!process.env.CIPHER_IV) throw new Error('Cipher IV not set')
  const keystr = crypto
    .createHash('sha256')
    .update(key)
    .digest('base64')
    .substring(0, 32)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    keystr,
    process.env.CIPHER_IV
  )
  const encrypted = cipher.update(data, 'utf8', 'hex')
  const final = cipher.final('hex')
  const auth = cipher.getAuthTag().toString('hex')
  return `${encrypted}${final} auth ${auth}`
}

/**
 * SHA256 hash a string.
 *
 * @param data Data to hash.
 * @returns SHA256 hash of the data.
 */
export const sha256 = (data: string) => {
  return crypto.createHash('sha256').update(data).digest('hex')
}
