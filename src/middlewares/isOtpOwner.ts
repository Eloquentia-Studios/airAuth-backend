import type { NextFunction, RequestHandler, Response } from 'express'
import { getOtp } from '../services/otp.js'

/**
 * Check that the OTP exists and is owned by the user.
 *
 * @param req Express request object.
 * @param res Express response object.
 * @param next Next middleware function.
 */
export const isOtpOwner: RequestHandler = async (req, res, next) => {
  if (req.params.id) {
    await handleOtp(req.params.id, req.user.id, res, next)
  } else {
    const { otpId } = req.body
    await handleOtp(otpId, req.user.id, res, next)
  }
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
  const otp = await getOtp(id)
  if (!otp) {
    return res.status(404).json({ code: 404, errors: ['OTP not found'] })
  }
  if (otp.ownerId !== userId) {
    return res.status(403).json({ code: 403, errors: ['Forbidden'] })
  }
  next()
}
