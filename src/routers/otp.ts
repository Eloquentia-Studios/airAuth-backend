import ErrorHandlingRouter from '../classes/ErrorHandlingRouter.js'
import HttpError from '../enums/HttpError.js'
import createResponseError from '../lib/createResponseError.js'
import dbWritesPrevented from '../middlewares/dbWritesPrevented.js'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isOtpOwner } from '../middlewares/isOtpOwner.js'
import { addOtp, deleteOtp, getOtps, updateOtp } from '../services/otp.js'
import { isString } from '../services/validate.js'

const otpRouter = new ErrorHandlingRouter()

// Handle POST /api/v1/otp requests to add a new OTP.
otpRouter.post('/', isAuthenticated, dbWritesPrevented, async (req, res) => {
  const { otpurl } = req.body

  // Add the OTP to the database.
  const otp = await addOtp(otpurl, req.user.id)

  // Return the OTP.
  return res.status(200).json({ id: otp.id })
})

// Handle GET /api/v1/otp requests to get all OTPs.
otpRouter.get('/', isAuthenticated, async (req, res) => {
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
})

// Handle DELETE /api/v1/otp/:id requests to delete an OTP.
otpRouter.delete(
  '/:id',
  isAuthenticated,
  isOtpOwner,
  dbWritesPrevented,
  async (req, res) => {
    // Delete the OTP.
    const deletedOtp = await deleteOtp(req.params.id)

    // Return the deleted OTP.
    res.status(200).json({ id: deletedOtp.id, otpurl: deletedOtp.url })
  }
)

// Handle POST /api/v1/otp/:id requests to set custom issuer and label.
otpRouter.post(
  '/:id',
  isAuthenticated,
  isOtpOwner,
  dbWritesPrevented,
  async (req, res) => {
    const { issuer, label } = req.body

    const errors = []

    if (!isString(issuer) && issuer !== null && issuer !== undefined)
      errors.push('Issuer must be a string, if provided.')
    if (!isString(label) && label !== null && label !== undefined)
      errors.push('Label must be a string, if provided.')

    if (errors.length > 0)
      return createResponseError(HttpError.BadRequest, errors, res)

    // Update the OTP.
    await updateOtp(req.params.id, issuer, label)

    res.status(200).json({ message: 'Success' })
  }
)

export default otpRouter
