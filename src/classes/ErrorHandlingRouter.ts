import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Router, RouterOptions } from 'express'
import HttpError from '../enums/HttpError.js'
import createResponseError from '../lib/createResponseError.js'

class ErrorHandlingRouter {
  router: Router

  constructor(options?: RouterOptions | undefined) {
    this.router = Router(options)
  }

  get(path: string, ...handlers: RequestHandler[]) {
    console.log('Wrapping get function', path)
    this.router.get(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  post(path: string, ...handlers: RequestHandler[]) {
    this.router.post(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  put(path: string, ...handlers: RequestHandler[]) {
    this.router.put(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  delete(path: string, ...handlers: RequestHandler[]) {
    this.router.delete(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  patch(path: string, ...handlers: RequestHandler[]) {
    this.router.patch(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  options(path: string, ...handlers: RequestHandler[]) {
    this.router.options(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  head(path: string, ...handlers: RequestHandler[]) {
    this.router.head(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  getRouter(): Router {
    return this.router
  }

  private static wrapFunctions(func: RequestHandler[]) {
    return func.map((f) => this.wrapFunction(f))
  }

  private static wrapFunction(func: RequestHandler) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await func(req, res, next)
      } catch (error) {
        ErrorHandlingRouter.internalServerErrorResponse(error, res)
      }
    }
  }

  private static internalServerErrorResponse(error: unknown, res: Response) {
    console.error(error)
    return createResponseError(
      HttpError.InternalServerError,
      'Unknown server error occurred',
      res
    )
  }
}

export default ErrorHandlingRouter
