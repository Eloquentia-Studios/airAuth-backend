/**
 * Create a new Prisma record with the same properties as the original, but with the updated properties
 * from the update object, excluding createdAt and updatedAt.
 *
 * @param oldData Old data.
 * @param newData New data.
 * @returns Object for updating a Prisma record.
 */
const createUpdatedPrismaObject = (oldData: any, newData: any) => ({
  ...oldData,
  ...newData,
  createdAt: undefined,
  updatedAt: undefined
})

export default createUpdatedPrismaObject
