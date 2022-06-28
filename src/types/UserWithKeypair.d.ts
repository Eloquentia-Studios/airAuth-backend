import { User, KeyPair } from '@prisma/client'

export default interface UserWithKeypair extends User {
  keyPair: KeyPair | null
}
