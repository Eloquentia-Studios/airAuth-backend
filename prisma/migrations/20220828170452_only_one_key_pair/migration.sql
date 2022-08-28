/*
  Warnings:

  - A unique constraint covering the columns `[ownerId]` on the table `KeyPair` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "KeyPair_ownerId_key" ON "KeyPair"("ownerId");
