import HttpError from '../enums/HttpError.js'

const createResponseError = (code: HttpError, errors: string[] | string) => {
  if (typeof errors === 'string') errors = [errors]
  return { code, errors }
}

export default createResponseError
