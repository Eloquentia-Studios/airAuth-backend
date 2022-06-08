import type TokenUserData from './TokenData.d'

declare global {
  namespace Express {
    export interface Request {
      user: TokenUserData
    }
  }
}
