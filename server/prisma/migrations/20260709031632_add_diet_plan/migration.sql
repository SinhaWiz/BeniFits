-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "DietPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetCalories" INTEGER,
    "targetProteinG" DOUBLE PRECISION,
    "targetFatG" DOUBLE PRECISION,
    "targetCarbsG" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietPlanMeal" (
    "id" TEXT NOT NULL,
    "dietPlanId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "description" TEXT NOT NULL,
    "fdcId" INTEGER,
    "calories" INTEGER,
    "proteinG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietPlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DietPlan_userId_idx" ON "DietPlan"("userId");

-- CreateIndex
CREATE INDEX "DietPlanMeal_dietPlanId_idx" ON "DietPlanMeal"("dietPlanId");

-- AddForeignKey
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanMeal" ADD CONSTRAINT "DietPlanMeal_dietPlanId_fkey" FOREIGN KEY ("dietPlanId") REFERENCES "DietPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
