import crypto from 'crypto'
import type KeyPair from '../types/KeyPair'

/**
 * Generate a random ED448 key pair.
 *
 * @returns Private and public key as a KeyPair object.
 */
export const generateKeyPair = async (): Promise<KeyPair> => {
  const keys = crypto.generateKeyPairSync('ed448', {
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
    public: keys.publicKey,
    private: keys.privateKey
  }
}

/**
 * Symmetrically encrypt the given data with the given key.
 *
 * @param data Data to encrypt.
 * @param key Key to use for encryption.
 * @returns Encrypted data along with authentication tag.
 */
export const symmetricEncrypt = async (
  data: string,
  key: string
): Promise<string> => {
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
 * Decrypts symmetrically encrypted data using the given key.
 *
 * @param data Data to decrypt.
 * @param key Key to use for decryption.
 * @returns Decrypted buffer.
 */
export const symmetricDecrypt = async (
  data: string,
  key: string
): Promise<Buffer> => {
  if (!process.env.CIPHER_IV) throw new Error('Cipher IV not set')
  const encData = data.split(' auth ')[0]
  const auth = data.split(' auth ')[1]

  const keystr = crypto
    .createHash('sha256')
    .update(key)
    .digest('base64')
    .substring(0, 32)

  const cipher = crypto.createDecipheriv(
    'aes-256-gcm',
    keystr,
    process.env.CIPHER_IV
  )
  cipher.setAuthTag(Buffer.from(auth, 'hex'))

  const decrypted = cipher.update(encData, 'hex')
  const final = cipher.final()
  return Buffer.concat([decrypted, final])
}
