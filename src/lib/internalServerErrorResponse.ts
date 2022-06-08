import type { Response } from 'express'

export const internalServerErrorResponse = async (
  error: unknown,
  res: Response
) => {
  res.status(500).json({ code: 500, errors: ['Internal server error occured'] })
  console.error(error)
}
