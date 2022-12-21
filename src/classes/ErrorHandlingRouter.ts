import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Router, RouterOptions } from 'express'
import HttpError from '../enums/HttpError.js'
import createResponseError from '../lib/createResponseError.js'

/**
 * @class ErrorHandlingRouter
 * @extends Router
 * @description
 * A router that handles errors thrown by the handlers it contains.
 * @param {RouterOptions} [options] - The options to pass to the router.
 * @example
 * const router = new ErrorHandlingRouter()
 * router.get('/', (req, res) => {
 *  throw new Error('Something went wrong')
 * })
 * @author Felix Bjerhem Aronsson <felix.b.aronsson@gmail.com>
 * @author Esaias Cronelius <esaias@cronelius.se>
 */
class ErrorHandlingRouter {
  // The underlying Express router.
  router: Router

  /**
   * ErrorHandlingRouter constructor.
   *
   * @param options Router options.
   */
  constructor(options?: RouterOptions | undefined) {
    this.router = Router(options)
  }

  /**
   * Register a get request handler.
   *
   * @param path Path to register the handler for.
   * @param handlers Request handlers.
   */
  get(path: string, ...handlers: RequestHandler[]) {
    this.router.get(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  /**
   * Register a post request handler.
   *
   * @param path Path to register the handler for.
   * @param handlers Request handlers.
   */
  post(path: string, ...handlers: RequestHandler[]) {
    this.router.post(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  /**
   * Register a put request handler.
   *
   * @param path Path to register the handler for.
   * @param handlers Request handlers.
   */
  put(path: string, ...handlers: RequestHandler[]) {
    this.router.put(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  /**
   * Register a delete request handler.
   *
   * @param path Path to register the handler for.
   * @param handlers Request handlers.
   */
  delete(path: string, ...handlers: RequestHandler[]) {
    this.router.delete(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  /**
   * Register a patch request handler.
   *
   * @param path Path to register the handler for.
   * @param handlers Request handlers.
   */
  patch(path: string, ...handlers: RequestHandler[]) {
    this.router.patch(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  /**
   * Register a options request handler.
   *
   * @param path Path to register the handler for.
   * @param handlers Request handlers.
   */
  options(path: string, ...handlers: RequestHandler[]) {
    this.router.options(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  /**
   * Register a head request handler.
   *
   * @param path Path to register the handler for.
   * @param handlers Request handlers.
   */
  head(path: string, ...handlers: RequestHandler[]) {
    this.router.head(path, ...ErrorHandlingRouter.wrapFunctions(handlers))
  }

  /**
   * Get the underlying Express router.
   *
   * @returns The underlying Express router.
   */
  getRouter(): Router {
    return this.router
  }

  /**
   * Wrap an array of request handler functions to catch any errors that occur.
   *
   * @param funcs Functions to wrap.
   * @returns An array of wrapped functions.
   */
  private static wrapFunctions(funcs: RequestHandler[]) {
    return funcs.map((f) => this.wrapFunction(f))
  }

  /**
   * Wrap a request handler function to catch any errors that occur.
   *
   * @param func Function to wrap.
   * @returns A wrapped function.
   */
  private static wrapFunction(func: RequestHandler) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        await func(req, res, next)
      } catch (error) {
        ErrorHandlingRouter.internalServerErrorResponse(error, res)
      }
    }
  }

  /**
   * Send an error response to the client.
   *
   * @param error Error to respond with.
   * @param res Response object.
   */
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
