import { sha256 } from '../services/encryption.js'

/**
 * Hash an object.
 *
 * @param obj Object to hash.
 * @returns Hash of the object.
 */
export default (obj: any) => sha256(JSON.stringify(obj))
