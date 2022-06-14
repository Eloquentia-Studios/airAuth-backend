import { Router } from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isValidOtpUrl, isString } from '../services/validate.js'
import { addOtp, deleteOtp, getOtps, updateOtp } from '../services/otp.js'
import { isOtpOwner } from '../middlewares/isOtpOwner.js'
import { internalServerErrorResponse } from '../lib/internalServerErrorResponse.js'

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
    internalServerErrorResponse(error, res)
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
      url: otp.url,
      customIssuer: otp.issuer,
      customLabel: otp.label
    }))

    // Return the OTPs.
    return res.status(200).json({ otps: responseOtps })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

// Handle DELETE /api/v1/otp/:id requests to delete an OTP.
otpRouter.delete('/:id', isAuthenticated, isOtpOwner, async (req, res) => {
  try {
    // Delete the OTP.
    const deletedOtp = await deleteOtp(req.params.id)

    // Return the deleted OTP.
    res.status(200).json({ id: deletedOtp.id, otpurl: deletedOtp.url })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

// Handle POST /api/v1/otp/:id requests to set custom issuer and label.
otpRouter.post('/:id', isAuthenticated, isOtpOwner, async (req, res) => {
  try {
    const { issuer, label } = req.body

    const errors = []

    if (!isString(issuer) && issuer !== null && issuer !== undefined)
      errors.push('Issuer must be a string, if provided.')
    if (!isString(label) && label !== null && label !== undefined)
      errors.push('Label must be a string, if provided.')

    if (errors.length > 0) return res.status(400).json({ code: 400, errors })

    // Update the OTP.
    await updateOtp(req.params.id, issuer, label)

    res.status(200).json({ message: 'Success' })
  } catch (error) {
    internalServerErrorResponse(error, res)
  }
})

export default otpRouter
