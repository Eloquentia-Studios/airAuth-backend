import type { Response } from 'express'
import HttpError from '../enums/HttpError.js'

const createResponseError = (
  code: HttpError,
  errors: string[] | string,
  res: Response
): void => {
  if (typeof errors === 'string') errors = [errors]
  res.status(code).json({ code, errors })
}

export default createResponseError
