import crypto from 'crypto'
import type KeyPair from '../types/KeyPair.d'

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
