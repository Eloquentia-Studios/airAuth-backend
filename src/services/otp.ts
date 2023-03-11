import type { Otp } from '@prisma/client'
import createUpdatedPrismaObject from '../lib/createUpdatedPrismaObject.js'
import hashObject from '../lib/hashObject.js'
import logDebug from '../lib/logDebug.js'
import type { RecordHash } from '../types/RecordHash.d'
import prisma from './prisma.js'

/**
 * Add a new OTP to the database.
 *
 * @param url Otp url.
 * @param ownerId Owner id.
 * @returns Otp object.
 */
export const addOtp = async (url: string, ownerId: string): Promise<Otp> => {
  logDebug('Adding OTP:', url, ownerId)
  const otp = await prisma.otp.create({
    data: {
      url,
      hash: hashObject({ url }),
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
  logDebug('Got OTPs:', otps, 'for user:', ownerId)

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

  logDebug('Got OTP:', otp)

  return otp
}

/**
 * Delete an OTP by id.
 *
 * @param id Otp id.
 * @returns The deleted Otp object.
 */
export const deleteOtp = async (id: string): Promise<Otp> => {
  logDebug('Deleting OTP:', id)
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
 * @returns The updated Otp object.d
 */
export const updateOtp = async (
  id: string,
  issuer?: string | null,
  label?: string | null
): Promise<Otp> => {
  logDebug('Updating OTP:', id, { issuer, label })

  // Create a new object from the old one with the updated fields.
  const newOtpData = createUpdatedPrismaObject(await getOtp(id), {
    issuer,
    label
  })

  // Update the OTP in the database.
  const updatedOtp = await prisma.otp.update({
    where: {
      id
    },
    data: {
      ...newOtpData,
      hash: hashObject(newOtpData)
    }
  })

  return updatedOtp
}

/**
 * Generate a hash for all the records of all the OTPs.
 *
 * @returns Array of all otp uuids and their corresponding hashes.
 */
export const getOtpHashes = async (): Promise<RecordHash[]> => {
  logDebug('Getting OTP hashes')
  return await prisma.otp.findMany({
    select: {
      id: true,
      hash: true
    }
  })
}
