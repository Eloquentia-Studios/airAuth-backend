import type { Response } from 'express'
import HttpError from '../enums/HttpError.js'

/**
 * Respond with an error on a HTTP request.
 *
 * @param code HTTP error code.
 * @param errors Error message(s).
 * @param res Express response object.
 */
const createResponseError = (
  code: HttpError,
  errors: string[] | string,
  res: Response
): void => {
  if (typeof errors === 'string') errors = [errors]
  res.status(code).json({ code, errors })
}

export default createResponseError
