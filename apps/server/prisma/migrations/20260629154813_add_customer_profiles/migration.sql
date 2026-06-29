-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING_DEVELOPMENT';

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "age" INTEGER,
    "address" TEXT,
    "occupation" TEXT,
    "preferredGame" TEXT,
    "preferredMode" TEXT,
    "preferredSingleDouble" TEXT,
    "preferredTime" TEXT,
    "playFrequency" TEXT,
    "pricePreference" TEXT,
    "relationshipStatus" TEXT,
    "afraidWechatCheck" BOOLEAN NOT NULL DEFAULT false,
    "likedVoice" TEXT,
    "myVoice" TEXT,
    "likesTalkative" BOOLEAN NOT NULL DEFAULT false,
    "likesSkill" BOOLEAN NOT NULL DEFAULT false,
    "likesBoth" BOOLEAN NOT NULL DEFAULT false,
    "customNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFollowUp" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "playerId" TEXT,
    "adminId" TEXT,
    "content" TEXT NOT NULL,
    "nextAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_customerId_key" ON "CustomerProfile"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
