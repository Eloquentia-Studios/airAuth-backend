-- CreateTable
CREATE TABLE "KeyPair" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "public" TEXT NOT NULL,
    "private" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyPair_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KeyPair" ADD CONSTRAINT "KeyPair_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
