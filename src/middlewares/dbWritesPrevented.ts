import type { RequestHandler } from 'express'
import HttpError from '../enums/HttpError.js'
import createResponseError from '../lib/createResponseError.js'
import { dbWritesPaused } from '../services/pauseTraffic.js'

/**
 * Check if database writes are paused currently
 *
 * @param req Express request object.
 * @param res Express response object.
 * @param next Next middleware function.
 */
const dbWritesPrevented: RequestHandler = async (req, res, next) => {
  // Check if writes are paused.
  if (dbWritesPaused()) {
    return createResponseError(
      HttpError.ServiceUnavailable,
      'Database writes are currently paused.',
      res
    )
  }
  // Continue with the request.
  next()
}

export default dbWritesPrevented
