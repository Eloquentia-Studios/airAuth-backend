import type { RequestHandler } from 'express'
import HttpError from '../enums/HttpError.js'
import createResponseError from '../lib/createResponseError.js'
import { verifyToken } from '../services/jwt.js'
import { getUser } from '../services/users.js'

/**
 * Check that the user is authenticated.
 *
 * @param req Express request object.
 * @param res Express response object.
 * @param next Next middleware function.
 */
const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check the authorization header.
  const authHeader = req.headers.authorization
  if (!authHeader)
    return createResponseError(HttpError.Unauthorized, 'Unauthorized', res)

  // Check the token.
  const token = authHeader.split(' ')[1]
  if (!token)
    return createResponseError(HttpError.Unauthorized, 'Unauthorized', res)

  // Check the token signature.
  const decoded = verifyToken(token)
  if (!decoded)
    return createResponseError(HttpError.Unauthorized, 'Unauthorized', res)

  // Check that the user still exists
  if (!(await getUser(decoded.id)))
    return createResponseError(
      HttpError.NotFound,
      'That user does not exist',
      res
    )

  // Set the user in the request object.
  req.user = decoded

  // Continue with the request.
  next()
}

export default isAuthenticated
