import type { NextFunction, RequestHandler, Response } from 'express'
import HttpError from '../enums/HttpError.js'
import createResponseError from '../lib/createResponseError.js'
import { getOtp } from '../services/otp.js'

/**
 * Check that the OTP exists and is owned by the user.
 *
 * @param req Express request object.
 * @param res Express response object.
 * @param next Next middleware function.
 */
const isOtpOwner: RequestHandler = async (req, res, next) => {
  // Get the OTP ID from the request parameters.
  if (req.params.id)
    return await handleOtp(req.params.id, req.user.id, res, next)

  // Get the OTP ID from the request body.
  const { otpId } = req.body
  await handleOtp(otpId, req.user.id, res, next)
}

/**
 * Handle the OTP verification logic.
 *
 * @param id The OTP ID.
 * @param userId The user ID.
 * @param res Express response object.
 * @param next Next middleware function.
 */
const handleOtp = async (
  id: string,
  userId: string,
  res: Response,
  next: NextFunction
) => {
  // Get the OTP.
  const otp = await getOtp(id)

  // Respond with 404 if the OTP does not exist.
  if (!otp) return createResponseError(HttpError.NotFound, 'OTP not found', res)

  // Respond with 403 if the OTP is not owned by the user.
  if (otp.ownerId !== userId)
    return createResponseError(HttpError.Forbidden, 'Forbidden', res)

  // Continue with the request.
  next()
}

export default isOtpOwner
