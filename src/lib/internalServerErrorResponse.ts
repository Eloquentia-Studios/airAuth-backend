import type { Response } from 'express'
import HttpError from '../enums/HttpError.js'
import createResponseError from './createResponseError.js'

export const internalServerErrorResponse = async (
  error: unknown,
  res: Response
) => {
  res
    .status(500)
    .json(
      createResponseError(
        HttpError.InternalServerError,
        'Unknown server error occurred'
      )
    )
  console.error(error)
}
