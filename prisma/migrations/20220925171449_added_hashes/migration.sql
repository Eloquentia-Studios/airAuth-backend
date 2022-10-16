/*
  Warnings:

  - Added the required column `hash` to the `KeyPair` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hash` to the `Otp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KeyPair" ADD COLUMN     "hash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "hash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hash" TEXT NOT NULL;
