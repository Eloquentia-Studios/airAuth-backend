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

/**
 * Get all OTPs for a user.
 *
 * @param ownerId Owner id.
 * @returns Array of Otp objects.
 */
export const getOtps = async (ownerId: string): Promise<Otp[]> => {
  const otps = await prisma.otp.findMany({
    where: {
      owner: {
        id: ownerId
      }
    }
  })

  return otps
}

/**
 * Get an OTP by id.
 *
 * @param id Otp id.
 * @returns Otp object, or null if not found.
 */
export const getOtp = async (id: string): Promise<Otp | null> => {
  const otp = await prisma.otp.findFirst({
    where: {
      id
    }
  })

  return otp
}

/**
 * Delete an OTP by id.
 *
 * @param id Otp id.
 * @returns The deleted Otp object.
 */
export const deleteOtp = async (id: string): Promise<Otp> => {
  const deletedOtp = await prisma.otp.delete({
    where: {
      id
    }
  })

  return deletedOtp
}

/**
 * Update OTP issuer and label.
 *
 * @param id Otp id.
 * @param issuer Otp issuer.
 * @param label Otp label.
 * @returns The updated Otp object.
 */
export const updateOtp = async (
  id: string,
  issuer?: string | null,
  label?: string | null
): Promise<Otp> => {
  const updatedOtp = await prisma.otp.update({
    where: {
      id
    },
    data: {
      issuer,
      label
    }
  })

  return updatedOtp
}
