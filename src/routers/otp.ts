import { Router } from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isValidOtpUrl } from '../services/validate.js'
import { addOtp, deleteOtp, getOtp, getOtps } from '../services/otp.js'

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

// Handle DELETE /api/v1/otp/:id requests to delete an OTP.
otpRouter.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    // Get the OTP.
    const otp = await getOtp(req.params.id)

    // Check that the OTP exists.
    if (!otp)
      return res.status(404).json({ code: 404, errors: ['OTP not found'] })

    // Check that the OTP belongs to the user.
    if (otp.ownerId !== req.user.id)
      return res.status(403).json({ code: 403, errors: ['Forbidden'] })

    // Delete the OTP.
    const deletedOtp = await deleteOtp(req.params.id)

    // Return the deleted OTP.
    res.status(200).json({ id: deletedOtp.id, otpurl: deletedOtp.url })
  } catch (error) {
    res.status(500).json({ code: 500, errors: ['Internal server error'] })
    console.error(error)
  }
})

export default otpRouter
