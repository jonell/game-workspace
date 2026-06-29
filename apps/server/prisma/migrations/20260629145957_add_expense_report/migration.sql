-- CreateTable
CREATE TABLE "ExpenseReport" (
    "id" TEXT NOT NULL,
    "companionId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE',
    "amount" DOUBLE PRECISION NOT NULL,
    "screenshotUrl" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Companion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
