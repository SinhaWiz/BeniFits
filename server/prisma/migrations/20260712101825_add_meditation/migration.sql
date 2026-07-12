-- CreateEnum
CREATE TYPE "MeditationCategory" AS ENUM ('BREATHING', 'BODY_SCAN', 'SLEEP', 'FOCUS', 'STRESS_RELIEF', 'MINDFULNESS');

-- CreateTable
CREATE TABLE "MeditationSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "MeditationCategory" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeditationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeditationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "completedOn" DATE NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeditationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeditationSession_category_idx" ON "MeditationSession"("category");

-- CreateIndex
CREATE INDEX "MeditationLog_userId_completedOn_idx" ON "MeditationLog"("userId", "completedOn");

-- AddForeignKey
ALTER TABLE "MeditationLog" ADD CONSTRAINT "MeditationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeditationLog" ADD CONSTRAINT "MeditationLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MeditationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
