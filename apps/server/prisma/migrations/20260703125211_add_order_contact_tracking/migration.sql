-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "contactStatus" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "screenshotUrl" TEXT;
