import { Router } from 'express'
import { isValidEmail, isValidUsername } from '../services/validate.js'

const usersRouter = Router()

// Handle POST /api/v1/user requests to create a new user.
usersRouter.post('/', (req, res) => {
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

  // Respond with 400 if the user information is invalid.
  if (errors.length > 0) return res.status(400).json({ code: 400, errors })

  console.log(username, email, phonenumber, password)
  res.status(200).json({ message: 'Success!' })
})

export default usersRouter
