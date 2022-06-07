import type { RequestHandler } from 'express'
import { verifyToken } from '../services/jwt.js'

/**
 * Check that the user is authenticated.
 *
 * @param req Express request object.
 * @param res Express response object.
 * @param next Next middleware function.
 */
export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Check the authorization header.
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ code: 401, errors: ['Unauthorized'] })
  }

  // Check the token.
  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ code: 401, errors: ['Unauthorized'] })
  }

  // Check the token signature.
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ code: 401, errors: ['Unauthorized'] })
  }

  // Set the user in the request object.
  req.user = decoded

  // Continue with the request.
  next()
}
