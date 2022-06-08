import { Router } from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isValidOtpUrl } from '../services/validate.js'
import { addOtp, getOtps } from '../services/otp.js'

const otpRouter = Router()

// Handle POST /api/v1/otp requests to add a new OTP.
otpRouter.post('/', isAuthenticated, async (req, res) => {
  try {
    const { otpurl } = req.body

    // Check that the URL is valid.
    if (!isValidOtpUrl(otpurl))
      return res.status(400).json({ code: 400, errors: ['Invalid OTP URL'] })

    // Add the OTP to the database.
    const otp = await addOtp(otpurl, req.user.id)

    // Return the OTP.
    return res.status(200).json({ id: otp.id })
  } catch (error) {
    res.status(500).json({ code: 500, errors: ['Internal server error'] })
    console.error(error)
  }
})

// Handle GET /api/v1/otp requests to get all OTPs.
otpRouter.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get all OTPs for the user.
    let otps = await getOtps(req.user.id)

    // Map otps to only return url and id
    const responseOtps = otps.map((otp) => ({
      id: otp.id,
      url: otp.url
    }))

    // Return the OTPs.
    return res.status(200).json({ otps: responseOtps })
  } catch (error) {
    res.status(500).json({ code: 500, errors: ['Internal server error'] })
    console.error(error)
  }
})

export default otpRouter
