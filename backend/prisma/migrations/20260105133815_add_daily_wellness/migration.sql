-- CreateEnum
CREATE TYPE "CyclePhase" AS ENUM ('MENSTRUAL', 'FOLLICULAR', 'OVULATION', 'LUTEAL');

-- CreateTable
CREATE TABLE "DailyWellness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "overallMood" INTEGER,
    "sleepQuality" INTEGER,
    "energyLevel" INTEGER,
    "stressLevel" INTEGER,
    "muscleSoreness" INTEGER,
    "motivation" INTEGER,
    "sleepDuration" DOUBLE PRECISION,
    "restingHR" INTEGER,
    "hrv" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "readinessScore" DOUBLE PRECISION,
    "notes" TEXT,
    "tags" TEXT[],
    "cycleDay" INTEGER,
    "cyclePhase" "CyclePhase",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyWellness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyWellness_userId_date_idx" ON "DailyWellness"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyWellness_userId_readinessScore_idx" ON "DailyWellness"("userId", "readinessScore");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWellness_userId_date_key" ON "DailyWellness"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyWellness" ADD CONSTRAINT "DailyWellness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
