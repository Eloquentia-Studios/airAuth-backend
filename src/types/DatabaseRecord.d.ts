export default interface DatabaseRecord {
  id: string
  hash: string
  createdAt: Date
  updatedAt: Date
  [key: string]: any
}
