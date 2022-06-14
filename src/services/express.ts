import express from 'express'
import usersRouter from '../routers/users.js'
import otpRouter from '../routers/otp.js'
import type { Express } from 'express'

/**
 * Create a new Express server and run the automatic setup.
 *
 * @returns Express instance.
 */
export const createServer = (): Express => {
  // Create a new express server.
  const app = express()
  setupGlobalMiddleware(app)
  setupRoutes(app)

  return app
}

/**
 * Sets up the global Express middlewares.
 *
 * @param app Express instance.
 */
const setupGlobalMiddleware = (app: Express): void => {
  app.use(express.json())
}

/**
 * Sets up the Express routes.
 *
 * @param app Express instance.
 */
const setupRoutes = (app: Express): void => {
  // Setup the users router.
  app.use('/api/v1/user', usersRouter)
  app.use('/api/v1/otp', otpRouter)

  // Respond with 404 for all non-existing routes.
  app.use((req, res) => {
    res.status(404).json({ code: 404, errors: ['Not found'] })
  })
}
