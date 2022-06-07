import { Router } from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'

const otpRouter = Router()

// Handle POST /api/v1/otp requests to add a new OTP.
otpRouter.post('/', isAuthenticated, (req, res) => {})

export default otpRouter
