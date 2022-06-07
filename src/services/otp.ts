import type { Otp } from '@prisma/client'
import prisma from './prisma.js'

/**
 * Add a new OTP to the database.
 *
 * @param url Otp url.
 * @param ownerId Owner id.
 * @returns Otp object.
 */
export const addOtp = async (url: string, ownerId: string): Promise<Otp> => {
  const otp = await prisma.otp.create({
    data: {
      url,
      owner: {
        connect: {
          id: ownerId
        }
      }
    }
  })

  return otp
}
