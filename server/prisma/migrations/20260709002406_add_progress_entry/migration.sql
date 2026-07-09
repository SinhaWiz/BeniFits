-- CreateTable
CREATE TABLE "ProgressEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedAt" DATE NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "sleepHours" DOUBLE PRECISION,
    "waterIntakeMl" INTEGER,
    "exerciseMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressEntry_userId_recordedAt_idx" ON "ProgressEntry"("userId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressEntry_userId_recordedAt_key" ON "ProgressEntry"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "ProgressEntry" ADD CONSTRAINT "ProgressEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
