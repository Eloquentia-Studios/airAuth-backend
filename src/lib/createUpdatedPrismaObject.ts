/**
 * Create an object for updating a Prisma object.
 *
 * @param oldData Old data.
 * @param newData New data.
 * @returns Object for updating a Prisma object.
 */
export default (oldData: any, newData: any) => ({
  ...oldData,
  ...newData,
  createdAt: undefined,
  updatedAt: undefined
})
