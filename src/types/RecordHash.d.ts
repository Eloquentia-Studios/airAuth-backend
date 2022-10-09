import { PrismaClient } from '@prisma/client'

export interface RecordHash {
  id: string
  hash: string
}

type FilterStartsWith<
  Set,
  Needle extends string
> = Set extends `${Needle}${infer _X}` ? Set : never
type FilteredKeys = FilterStartsWith<keyof PrismaClient, '$'>
export type TableNames = keyof Omit<PrismaClient, FilteredKeys>
export type TableNamesList = TableNames[]

export type RecordHashes = {
  [K in TableNames]?: RecordHash[]
}
