import type TokenData from './TokenData.d'

declare global {
  namespace Express {
    export interface Request {
      user: TokenData
    }
  }
}
