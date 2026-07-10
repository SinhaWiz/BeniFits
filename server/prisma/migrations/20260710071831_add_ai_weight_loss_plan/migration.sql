-- CreateTable
CREATE TABLE "AiWeightLossPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetWeightKg" DOUBLE PRECISION NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiWeightLossPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiWeightLossPlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "targetCalories" INTEGER NOT NULL,
    "targetProteinG" DOUBLE PRECISION NOT NULL,
    "workoutSummary" TEXT NOT NULL,
    "walkingGoalMinutes" INTEGER NOT NULL,
    "waterGoalMl" INTEGER NOT NULL,
    "sleepGoalHours" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AiWeightLossPlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiWeightLossPlan_userId_idx" ON "AiWeightLossPlan"("userId");

-- CreateIndex
CREATE INDEX "AiWeightLossPlanWeek_planId_idx" ON "AiWeightLossPlanWeek"("planId");

-- AddForeignKey
ALTER TABLE "AiWeightLossPlan" ADD CONSTRAINT "AiWeightLossPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiWeightLossPlanWeek" ADD CONSTRAINT "AiWeightLossPlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AiWeightLossPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
