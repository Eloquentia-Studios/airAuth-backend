import { Router } from 'express'
import {
  createUser,
  deleteUser,
  getUser,
  updateUser,
  validateUser
} from '../services/users.js'
import { generateToken } from '../services/jwt.js'
import { isString, isValidUserInformation } from '../services/validate.js'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { internalServerErrorResponse } from './../lib/internalServerErrorResponse.js'

const usersRouter = Router()

// Handle POST /api/v1/user requests to create a new user.
usersRouter.post('/', async (req, res) => {
  try {
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
    if (errors.length > 0) return res.status(400).json({ code: 400, errors })

    // Create a new user.
    const user = createUser(username, email, password, phonenumber)

    res.status(200).json({ message: 'Success!' })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

// Handle POST /api/v1/user/login requests to login a user.
usersRouter.post('/login', async (req, res) => {
  try {
    // Fetch the user information from the request body.
    const { identifier, password } = req.body

    const errors = []

    if (!isString(identifier)) errors.push('Identifier must be a string')

    if (!isString(password)) errors.push('Password must be a string')

    if (errors.length > 0) return res.status(400).json({ code: 400, errors })

    // Validate the user.
    const user = await validateUser(identifier, password)

    // Respond with 401 if the user is not valid.
    if (!user)
      return res.status(401).json({ code: 401, errors: ['Invalid user'] })

    // Create a JWT token for the user.
    const token = generateToken(user)

    res.status(200).json({ token })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

// Handle DELETE /api/v1/user requests to delete their user account.
usersRouter.delete('/', isAuthenticated, async (req, res) => {
  try {
    // Get the current user.
    const reqUser = req.user

    // Delete the user.
    await deleteUser(reqUser.id)

    // Respond with 200 if the user was deleted.
    return res.status(200).json({ message: 'Success!' })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

// Handle PATCH /api/v1/user requests to update the user's information.
usersRouter.patch('/', isAuthenticated, async (req, res) => {
  try {
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
    if (errors.length > 0) return res.status(400).json({ code: 400, errors })

    // Update the user.
    await updateUser(reqUser.id, {
      username,
      email,
      phonenumber,
      password
    })

    res.status(200).json({ message: 'Success!' })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

// Handle GET /api/v1/user requests to get the user's information.
usersRouter.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get the current user.
    const reqUser = req.user

    // Get the user.
    const user = await getUser(reqUser.id)

    // Respond with 404 if the user does not exist.
    if (!user)
      return res
        .status(404)
        .json({ code: 404, errors: ['User does not exist'] })

    // Extract the user's information.
    const { id, username, email, phonenumber } = user

    // Respond with 200 if the user was found.
    return res.status(200).json({ id, username, email, phonenumber })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

export default usersRouter
