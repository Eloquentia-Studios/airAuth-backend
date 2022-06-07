import { Router } from 'express'
import { createUser, getUser, validateUser } from '../services/users.js'
import {
  isString,
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  isValidUsername
} from '../services/validate.js'

const usersRouter = Router()

// Handle POST /api/v1/user requests to create a new user.
usersRouter.post('/', async (req, res) => {
  try {
    // Fetch the user information from the request body.
    const { username, email, phonenumber, password } = req.body

    // Validate the user information.
    const errors = []
    if (!isValidUsername(username)) {
      errors.push(
        'Invalid username, must be between 3 and 40 characters and alphanumeric.'
      )
    }

    if (!isValidEmail(email)) {
      errors.push('Invalid email.')
    }

    if (phonenumber && !isValidPhoneNumber(phonenumber)) {
      errors.push('Invalid phone number.')
    }

    if (!isValidPassword(password)) {
      errors.push(
        'Invalid password, must be at least 10 characters long and be a mix of lowercase, uppercase, numbers and special characters.'
      )
    }

    // Check if there are users with the same username, email or phonenumber.
    if (await getUser(username)) {
      errors.push('Username already exists.')
    }

    if (await getUser(email)) {
      errors.push('Email already exists.')
    }

    if (phonenumber && (await getUser(phonenumber))) {
      errors.push('Phone number already exists.')
    }

    // Respond with 400 if the user information is invalid.
    if (errors.length > 0) return res.status(400).json({ code: 400, errors })

    // Create a new user.
    const user = createUser(username, email, password, phonenumber)

    res.status(200).json({ message: 'Success!' })
  } catch (error) {
    res
      .status(500)
      .json({ code: 500, errors: ['Internal server error occured'] })
    console.error(error)
  }
})

// Handle POST /api/v1/user/login requests to login a user.
usersRouter.post('/login', async (req, res) => {
  try {
    // Fetch the user information from the request body.
    const { identifier, password } = req.body

    const errors = []

    if (isString(identifier)) errors.push('Identifier must be a string')

    if (isString(password)) errors.push('Password must be a string')

    if (errors.length > 0) return res.status(400).json({ code: 400, errors })

    // Validate the user.
    const user = await validateUser(identifier, password)

    // Respond with 401 if the user is not valid.
    if (!user)
      return res.status(401).json({ code: 401, errors: ['Invalid user'] })

    // Create a JWT token for the user.
  } catch (error) {
    res
      .status(500)
      .json({ code: 500, errors: ['Internal server error occured'] })
    console.error(error)
  }
})

export default usersRouter
