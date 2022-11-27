import ErrorHandlingRouter from '../classes/ErrorHandlingRouter.js'
import HttpError from '../enums/HttpError.js'
import createResponseError from '../lib/createResponseError.js'
import dbWritesPrevented from '../middlewares/dbWritesPrevented.js'
import isAuthenticated from '../middlewares/isAuthenticated.js'
import { generateToken } from '../services/jwt.js'
import {
  createUser,
  deleteUser,
  getUser,
  updateUser,
  validateUser
} from '../services/users.js'
import { isString, isValidUserInformation } from '../services/validate.js'

const usersRouter = new ErrorHandlingRouter()

// Handle POST /api/v1/user requests to create a new user.
usersRouter.post('/', dbWritesPrevented, async (req, res) => {
  // Fetch the user information from the request body.
  const { username, email, phonenumber, password } = req.body

  // Validate the user information.
  const errors = await isValidUserInformation(
    username,
    email,
    phonenumber,
    password,
    false
  )

  // Respond with 400 if the user information is invalid.
  if (errors.length > 0)
    return createResponseError(HttpError.BadRequest, errors, res)

  // Create a new user.
  const { keyPair } = await createUser(username, email, password, phonenumber)

  res.status(200).json({ message: 'Success' })
})

// Handle POST /api/v1/user/login requests to login a user.
usersRouter.post('/login', async (req, res) => {
  // Fetch the user information from the request body.
  const { identifier, password } = req.body

  const errors = []

  if (!isString(identifier)) errors.push('Identifier must be a string')

  if (!isString(password)) errors.push('Password must be a string')

  if (errors.length > 0)
    return createResponseError(HttpError.BadRequest, errors, res)

  // Validate the user.
  const user = await validateUser(identifier, password)

  // Respond with 401 if the user is not valid.
  if (!user)
    return res.status(401).json({ code: 401, errors: ['Invalid user'] })

  // Create a JWT token for the user.
  const token = generateToken(user)

  // Get encryption iv.
  const iv = process.env.CIPHER_IV || ''

  res.status(200).json({
    token,
    keyPair: {
      privateKey: user.keyPair.privateKey,
      publicKey: user.keyPair.publicKey
    },
    iv
  })
})

// Handle DELETE /api/v1/user requests to delete their user account.
usersRouter.delete(
  '/',
  isAuthenticated,
  dbWritesPrevented,
  async (req, res) => {
    // Get the current user.
    const reqUser = req.user

    // Delete the user.
    await deleteUser(reqUser.id)

    // Respond with 200 if the user was deleted.
    return res.status(200).json({ message: 'Success!' })
  }
)

// Handle PATCH /api/v1/user requests to update the user's information.
usersRouter.patch('/', isAuthenticated, dbWritesPrevented, async (req, res) => {
  // Get the current user.
  const reqUser = req.user

  // Fetch the user information from the request body.
  const { username, email, phonenumber, password } = req.body

  // Validate the user information.
  const errors = await isValidUserInformation(
    username,
    email,
    phonenumber,
    password,
    true
  )

  // Respond with 400 if the user information is invalid.
  if (errors.length > 0)
    return createResponseError(HttpError.BadRequest, errors, res)

  // Update the user.
  await updateUser(reqUser.id, {
    username,
    email,
    phonenumber,
    password
  })

  res.status(200).json({ message: 'Success!' })
})

// Handle GET /api/v1/user requests to get the user's information.
usersRouter.get('/', isAuthenticated, async (req, res) => {
  // Get the current user.
  const reqUser = req.user

  // Get the user.
  const user = await getUser(reqUser.id)

  // Respond with 404 if the user does not exist.
  if (!user)
    return createResponseError(HttpError.NotFound, 'User does not exist', res)

  // Extract the user's information.
  const { id, username, email, phonenumber } = user

  // Respond with 200 if the user was found.
  return res.status(200).json({ id, username, email, phonenumber })
})

export default usersRouter
