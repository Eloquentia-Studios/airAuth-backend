import type { Otp } from '@prisma/client'
import createUpdatedPrismaObject from '../lib/createUpdatedPrismaObject.js'
import hashObject from '../lib/hashObject.js'
import type { RecordHash } from '../types/RecordHash.d'
import prisma from './prisma.js'
import { deleteRecord, updateRecord } from './sync.js'

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
      hash: hashObject({ url }),
      owner: {
        connect: {
          id: ownerId
        }
      }
    }
  })

  // Send to remote servers.
  updateRecord('otp', otp)

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

  // Send delete to remote servers.
  deleteRecord('otp', deletedOtp.id, Date.now())

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
  const newOtpData = createUpdatedPrismaObject(await getOtp(id), {
    issuer,
    label
  })

  const updatedOtp = await prisma.otp.update({
    where: {
      id
    },
    data: {
      ...newOtpData,
      hash: hashObject(newOtpData)
    }
  })

  // Send to remote servers.
  updateRecord('otp', updatedOtp)

  return updatedOtp
}

/**
 * Generate a hash for all the records of all the OTPs.
 *
 * @returns Array of all otp uuids and their corresponding hashes.
 */
export const getOtpHashes = async (): Promise<RecordHash[]> => {
  // Get all OTP records with hashes.
  return await prisma.otp.findMany({
    select: {
      id: true,
      hash: true
    }
  })
}
