import { Router } from 'express'
import { createUser, getUser } from '../services/users.js'
import {
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

export default usersRouter
