/*
  Warnings:

  - You are about to drop the column `private` on the `KeyPair` table. All the data in the column will be lost.
  - You are about to drop the column `public` on the `KeyPair` table. All the data in the column will be lost.
  - Added the required column `privateKey` to the `KeyPair` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `KeyPair` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KeyPair" DROP COLUMN "private",
DROP COLUMN "public",
ADD COLUMN     "privateKey" TEXT NOT NULL,
ADD COLUMN     "publicKey" TEXT NOT NULL;
