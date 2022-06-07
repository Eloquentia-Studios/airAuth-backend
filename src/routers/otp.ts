import { Router } from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isValidOtpUrl } from '../services/validate.js'

const otpRouter = Router()

// Handle POST /api/v1/otp requests to add a new OTP.
otpRouter.post('/', isAuthenticated, (req, res) => {
  try {
    const { otpurl } = req.body
    console.log(otpurl)

    // Check that the URL is valid.
    if (!isValidOtpUrl(otpurl))
      return res.status(400).json({ code: 400, errors: ['Invalid OTP URL'] })

    res.status(201).json({ code: 201 })
  } catch (error) {
    res.status(500).json({ code: 500, errors: ['Internal server error'] })
    console.error(error)
  }
})

export default otpRouter
