import crypto from 'crypto'
import type KeyPair from '../types/KeyPair.d'

/**
 * Generate a random RSA key pair.
 *
 * @returns Private and public key as a KeyPair object.
 */
export const generateRSAKeyPair = async (): Promise<KeyPair> => {
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
 * Generate a random ECDSA key pair.
 *
 * @returns Private and public key as a KeyPair object.
 */
export const generateECDSAKeyPair = async (): Promise<KeyPair> => {
  const keys = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp521r1',
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
  const { privateKey, publicKey } = await generateRSAKeyPair()

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
  const keyString = createKeyString(key)
  const cipher = createCipher(keyString)

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

/**
 * Create a key string.
 *
 * @param key Encryption key.
 * @returns Key string.
 */
const createKeyString = (key: string): string => {
  return crypto
    .createHash('sha256')
    .update(key)
    .digest('base64')
    .substring(0, 32)
}

/**
 * Create a aes-256-gcm cipher.
 *
 * @param keyString Key string.
 * @returns Cipher IV and cipher.
 */
const createCipher = (keyString: string) => {
  // Check for IV in environment variables.
  if (!process.env.CIPHER_IV) throw new Error('Cipher IV not set')

  // Create and return cipher.
  return crypto.createCipheriv('aes-256-gcm', keyString, process.env.CIPHER_IV)
}
