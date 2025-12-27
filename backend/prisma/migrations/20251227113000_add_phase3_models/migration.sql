-- CreateEnum
CREATE TYPE "PeakMetricType" AS ENUM ('POWER_5S', 'POWER_10S', 'POWER_15S', 'POWER_30S', 'POWER_1MIN', 'POWER_2MIN', 'POWER_3MIN', 'POWER_5MIN', 'POWER_10MIN', 'POWER_20MIN', 'POWER_30MIN', 'POWER_60MIN', 'POWER_90MIN', 'POWER_120MIN', 'PACE_400M', 'PACE_1KM', 'PACE_1MILE', 'PACE_5KM', 'PACE_10KM', 'PACE_HALF_MARATHON', 'PACE_MARATHON', 'SWIM_100M', 'SWIM_200M', 'SWIM_400M', 'SWIM_1500M', 'MAX_HR', 'LONGEST_RIDE', 'LONGEST_RUN', 'HIGHEST_TSS', 'BEST_EF');

-- CreateEnum
CREATE TYPE "Units" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('RACE', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'RECOVERY', 'ENDURANCE', 'STRENGTH', 'BRICK', 'TIME_TRIAL', 'OPEN_WATER', 'TECHNIQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "LiftType" AS ENUM ('BACK_SQUAT', 'FRONT_SQUAT', 'DEADLIFT', 'SUMO_DEADLIFT', 'ROMANIAN_DEADLIFT', 'POWER_CLEAN', 'BENCH_PRESS', 'INCLINE_BENCH', 'DIP', 'OVERHEAD_PRESS', 'PUSH_PRESS', 'PULL_UP', 'CHIN_UP', 'PENDLAY_ROW', 'BENT_OVER_ROW');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'ANTERIOR_DELTS', 'LATERAL_DELTS', 'TRICEPS', 'LATS', 'REAR_DELTS', 'BICEPS', 'TRAPS', 'ABDOMINALS', 'OBLIQUES', 'SPINAL_ERECTORS', 'QUADS', 'GLUTES', 'HAMSTRINGS', 'HIP_FLEXORS', 'ADDUCTORS', 'CALVES', 'FOREARMS');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'IRONMAN', 'MARATHON', 'HALF_MARATHON', 'CENTURY', 'GENERAL_FITNESS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PeriodizationType" AS ENUM ('LINEAR', 'REVERSE_LINEAR', 'BLOCK', 'POLARIZED', 'PYRAMIDAL');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('BASE', 'BUILD', 'PEAK', 'RACE', 'RECOVERY', 'TRANSITION');

-- CreateEnum
CREATE TYPE "WeekType" AS ENUM ('NORMAL', 'RECOVERY', 'TEST', 'RACE', 'TRANSITION');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('PLANNED', 'COMPLETED', 'PARTIAL', 'SKIPPED', 'MOVED');

-- CreateEnum
CREATE TYPE "GearType" AS ENUM ('BIKE', 'BIKE_SHOES', 'RUN_SHOES', 'WETSUIT', 'GOGGLES', 'HELMET', 'POWER_METER', 'HR_MONITOR', 'GPS_WATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('DRILL', 'STRETCH', 'WARMUP', 'COOLDOWN', 'STRENGTH_EXERCISE', 'MOBILITY', 'RECOVERY', 'TECHNIQUE_VIDEO', 'TUTORIAL');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'IMAGE', 'TEXT', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "stravaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "units" "Units" NOT NULL DEFAULT 'METRIC',
    "weekStartDay" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "emailDigest" BOOLEAN NOT NULL DEFAULT true,
    "weeklyReport" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaAthleteId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "sex" "Sex",
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "ftp" INTEGER,
    "lthr" INTEGER,
    "thresholdPace" DOUBLE PRECISION,
    "css" DOUBLE PRECISION,
    "maxHr" INTEGER,
    "restingHr" INTEGER,
    "hrZones" JSONB,
    "powerZones" JSONB,
    "paceZones" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sportType" "SportType" NOT NULL,
    "workoutType" "WorkoutType",
    "startDate" TIMESTAMP(3) NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION,
    "totalElevation" DOUBLE PRECISION,
    "tss" DOUBLE PRECISION,
    "normalizedPower" DOUBLE PRECISION,
    "intensityFactor" DOUBLE PRECISION,
    "variabilityIndex" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "avgPower" INTEGER,
    "maxPower" INTEGER,
    "avgSpeed" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "avgCadence" INTEGER,
    "avgPace" DOUBLE PRECISION,
    "normalizedPace" DOUBLE PRECISION,
    "poolLength" INTEGER,
    "avgSwolf" DOUBLE PRECISION,
    "avgStrokeRate" DOUBLE PRECISION,
    "efficiencyFactor" DOUBLE PRECISION,
    "decoupling" DOUBLE PRECISION,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "hasStreams" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRecord" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "heartRate" INTEGER,
    "power" INTEGER,
    "cadence" INTEGER,
    "speed" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "groundContactTime" INTEGER,
    "verticalOscillation" DOUBLE PRECISION,
    "strideLength" DOUBLE PRECISION,

    CONSTRAINT "ActivityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLap" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "lapIndex" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "avgPower" INTEGER,
    "maxPower" INTEGER,
    "avgSpeed" DOUBLE PRECISION,
    "avgCadence" INTEGER,

    CONSTRAINT "ActivityLap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySplit" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "splitIndex" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "avgHeartRate" INTEGER,
    "avgPower" INTEGER,
    "avgPace" DOUBLE PRECISION,
    "elevationDiff" DOUBLE PRECISION,

    CONSTRAINT "ActivitySplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "peak5s" INTEGER,
    "peak30s" INTEGER,
    "peak1min" INTEGER,
    "peak5min" INTEGER,
    "peak20min" INTEGER,
    "peak60min" INTEGER,
    "pacePeak5s" DOUBLE PRECISION,
    "pacePeak1min" DOUBLE PRECISION,
    "pacePeak5min" DOUBLE PRECISION,
    "pacePeak20min" DOUBLE PRECISION,
    "efficiencyFactor" DOUBLE PRECISION,
    "aerobicDecoupling" DOUBLE PRECISION,
    "avgGCT" INTEGER,
    "avgVO" DOUBLE PRECISION,
    "avgStrideLength" DOUBLE PRECISION,
    "gctBalance" DOUBLE PRECISION,
    "hrZone1Time" INTEGER,
    "hrZone2Time" INTEGER,
    "hrZone3Time" INTEGER,
    "hrZone4Time" INTEGER,
    "hrZone5Time" INTEGER,
    "powerZone1Time" INTEGER,
    "powerZone2Time" INTEGER,
    "powerZone3Time" INTEGER,
    "powerZone4Time" INTEGER,
    "powerZone5Time" INTEGER,
    "powerZone6Time" INTEGER,
    "powerZone7Time" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeakPerformance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportType" "SportType" NOT NULL,
    "metricType" "PeakMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER,
    "distance" DOUBLE PRECISION,
    "activityId" TEXT,
    "achievedAt" TIMESTAMP(3) NOT NULL,
    "previousBest" DOUBLE PRECISION,
    "improvement" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeakPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctl" DOUBLE PRECISION,
    "atl" DOUBLE PRECISION,
    "tsb" DOUBLE PRECISION,
    "rampRate" DOUBLE PRECISION,
    "activityCount" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "swimDuration" INTEGER NOT NULL DEFAULT 0,
    "bikeDuration" INTEGER NOT NULL DEFAULT 0,
    "runDuration" INTEGER NOT NULL DEFAULT 0,
    "strengthDuration" INTEGER NOT NULL DEFAULT 0,
    "swimTss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bikeTss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runTss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sleepDuration" INTEGER,
    "sleepQuality" DOUBLE PRECISION,
    "restingHr" INTEGER,
    "hrv" DOUBLE PRECISION,
    "bodyWeight" DOUBLE PRECISION,
    "trainingReadiness" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strengthScore" DOUBLE PRECISION,
    "symmetryScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "squatScore" DOUBLE PRECISION,
    "floorPullScore" DOUBLE PRECISION,
    "horizPressScore" DOUBLE PRECISION,
    "vertPressScore" DOUBLE PRECISION,
    "pullScore" DOUBLE PRECISION,
    "classification" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiftRecord" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "liftType" "LiftType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "bodyweight" DOUBLE PRECISION NOT NULL,
    "estimated1RM" DOUBLE PRECISION NOT NULL,
    "strengthScore" DOUBLE PRECISION NOT NULL,
    "percentile" DOUBLE PRECISION,
    "classification" TEXT NOT NULL,
    "isBodyweight" BOOLEAN NOT NULL DEFAULT false,
    "addedWeight" DOUBLE PRECISION,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "sessionId" TEXT,

    CONSTRAINT "LiftRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MuscleGroupScore" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "classification" TEXT NOT NULL,
    "percentDeviation" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MuscleGroupScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrengthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "liftType" "LiftType",
    "orderIndex" INTEGER NOT NULL,
    "sets" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "StrengthExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "planType" "PlanType" NOT NULL,
    "targetEvent" TEXT,
    "targetDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "weeks" INTEGER NOT NULL,
    "periodization" "PeriodizationType" NOT NULL DEFAULT 'LINEAR',
    "weeklyHoursMin" DOUBLE PRECISION,
    "weeklyHoursMax" DOUBLE PRECISION,
    "peakTssWeek" DOUBLE PRECISION,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPhase" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phaseType" "PhaseType" NOT NULL,
    "weekStart" INTEGER NOT NULL,
    "weekEnd" INTEGER NOT NULL,
    "focusAreas" TEXT[],
    "intensityLevel" TEXT NOT NULL,
    "volumeLevel" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PlanPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetTss" DOUBLE PRECISION,
    "targetHours" DOUBLE PRECISION,
    "targetSwimHours" DOUBLE PRECISION,
    "targetBikeHours" DOUBLE PRECISION,
    "targetRunHours" DOUBLE PRECISION,
    "targetStrength" INTEGER,
    "actualTss" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "compliance" DOUBLE PRECISION,
    "weekType" "WeekType" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,

    CONSTRAINT "PlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "weekId" TEXT,
    "userId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "timeOfDay" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sportType" "SportType" NOT NULL,
    "workoutType" "WorkoutType",
    "targetDuration" INTEGER,
    "targetDistance" DOUBLE PRECISION,
    "targetTss" DOUBLE PRECISION,
    "isStructured" BOOLEAN NOT NULL DEFAULT false,
    "structure" JSONB,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'PLANNED',
    "completedActivityId" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sportType" "SportType" NOT NULL,
    "workoutType" "WorkoutType",
    "estimatedDuration" INTEGER,
    "estimatedDistance" DOUBLE PRECISION,
    "estimatedTss" DOUBLE PRECISION,
    "isStructured" BOOLEAN NOT NULL DEFAULT false,
    "structure" JSONB,
    "category" TEXT,
    "difficulty" TEXT,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gear" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "gearType" "GearType" NOT NULL,
    "sportType" "SportType",
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "totalActivities" INTEGER NOT NULL DEFAULT 0,
    "maxDistance" DOUBLE PRECISION,
    "maxDuration" INTEGER,
    "retiredAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityGear" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "gearId" TEXT NOT NULL,

    CONSTRAINT "ActivityGear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GearMaintenance" (
    "id" TEXT NOT NULL,
    "gearId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "cost" DOUBLE PRECISION,
    "distanceAtMaintenance" DOUBLE PRECISION,
    "nextDueDistance" DOUBLE PRECISION,
    "nextDueDate" TIMESTAMP(3),

    CONSTRAINT "GearMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyNutrition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "waterMl" INTEGER,
    "calorieTarget" DOUBLE PRECISION,
    "proteinTarget" DOUBLE PRECISION,
    "carbTarget" DOUBLE PRECISION,
    "fatTarget" DOUBLE PRECISION,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionEntry" (
    "id" TEXT NOT NULL,
    "dailyId" TEXT NOT NULL,
    "meal" "MealType" NOT NULL,
    "name" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "time" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ResourceCategory" NOT NULL,
    "sportType" "SportType",
    "subcategory" TEXT,
    "tags" TEXT[],
    "contentType" "ContentType" NOT NULL,
    "content" TEXT,
    "videoUrl" TEXT,
    "videoEmbedId" TEXT,
    "imageUrl" TEXT,
    "duration" INTEGER,
    "instructions" TEXT,
    "cues" TEXT[],
    "equipment" TEXT[],
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "targetAreas" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ResourceCategory" NOT NULL,
    "sportType" "SportType",
    "estimatedDuration" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineItem" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "resourceId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "customName" TEXT,
    "customDuration" INTEGER,
    "reps" INTEGER,
    "sets" INTEGER,
    "restBetweenSets" INTEGER,
    "customInstructions" TEXT,

    CONSTRAINT "RoutineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaId_key" ON "User"("stravaId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_stravaId_idx" ON "User"("stravaId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaConnection_userId_key" ON "StravaConnection"("userId");

-- CreateIndex
CREATE INDEX "StravaConnection_stravaAthleteId_idx" ON "StravaConnection"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_userId_key" ON "AthleteProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_stravaId_key" ON "Activity"("stravaId");

-- CreateIndex
CREATE INDEX "Activity_userId_startDate_idx" ON "Activity"("userId", "startDate");

-- CreateIndex
CREATE INDEX "Activity_userId_sportType_idx" ON "Activity"("userId", "sportType");

-- CreateIndex
CREATE INDEX "Activity_stravaId_idx" ON "Activity"("stravaId");

-- CreateIndex
CREATE INDEX "ActivityRecord_activityId_timestamp_idx" ON "ActivityRecord"("activityId", "timestamp");

-- CreateIndex
CREATE INDEX "ActivityLap_activityId_idx" ON "ActivityLap"("activityId");

-- CreateIndex
CREATE INDEX "ActivitySplit_activityId_idx" ON "ActivitySplit"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityMetrics_activityId_key" ON "ActivityMetrics"("activityId");

-- CreateIndex
CREATE INDEX "PeakPerformance_userId_sportType_metricType_idx" ON "PeakPerformance"("userId", "sportType", "metricType");

-- CreateIndex
CREATE INDEX "PeakPerformance_userId_achievedAt_idx" ON "PeakPerformance"("userId", "achievedAt");

-- CreateIndex
CREATE INDEX "DailyMetrics_userId_date_idx" ON "DailyMetrics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_userId_date_key" ON "DailyMetrics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StrengthProfile_userId_key" ON "StrengthProfile"("userId");

-- CreateIndex
CREATE INDEX "LiftRecord_profileId_liftType_idx" ON "LiftRecord"("profileId", "liftType");

-- CreateIndex
CREATE INDEX "LiftRecord_profileId_performedAt_idx" ON "LiftRecord"("profileId", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MuscleGroupScore_profileId_muscleGroup_key" ON "MuscleGroupScore"("profileId", "muscleGroup");

-- CreateIndex
CREATE INDEX "StrengthSession_userId_date_idx" ON "StrengthSession"("userId", "date");

-- CreateIndex
CREATE INDEX "StrengthExercise_sessionId_idx" ON "StrengthExercise"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "PlanPhase_planId_idx" ON "PlanPhase"("planId");

-- CreateIndex
CREATE INDEX "PlanWeek_planId_idx" ON "PlanWeek"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanWeek_planId_weekNumber_key" ON "PlanWeek"("planId", "weekNumber");

-- CreateIndex
CREATE INDEX "PlannedWorkout_userId_scheduledDate_idx" ON "PlannedWorkout"("userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "PlannedWorkout_planId_idx" ON "PlannedWorkout"("planId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_sportType_category_idx" ON "WorkoutTemplate"("sportType", "category");

-- CreateIndex
CREATE INDEX "Gear_userId_gearType_isActive_idx" ON "Gear"("userId", "gearType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGear_activityId_gearId_key" ON "ActivityGear"("activityId", "gearId");

-- CreateIndex
CREATE INDEX "GearMaintenance_gearId_idx" ON "GearMaintenance"("gearId");

-- CreateIndex
CREATE INDEX "DailyNutrition_userId_date_idx" ON "DailyNutrition"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNutrition_userId_date_key" ON "DailyNutrition"("userId", "date");

-- CreateIndex
CREATE INDEX "Resource_category_sportType_idx" ON "Resource"("category", "sportType");

-- CreateIndex
CREATE INDEX "Routine_category_sportType_idx" ON "Routine"("category", "sportType");

-- CreateIndex
CREATE INDEX "RoutineItem_routineId_idx" ON "RoutineItem"("routineId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaConnection" ADD CONSTRAINT "StravaConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRecord" ADD CONSTRAINT "ActivityRecord_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLap" ADD CONSTRAINT "ActivityLap_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySplit" ADD CONSTRAINT "ActivitySplit_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityMetrics" ADD CONSTRAINT "ActivityMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetrics" ADD CONSTRAINT "DailyMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthProfile" ADD CONSTRAINT "StrengthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiftRecord" ADD CONSTRAINT "LiftRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrengthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuscleGroupScore" ADD CONSTRAINT "MuscleGroupScore_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrengthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSession" ADD CONSTRAINT "StrengthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthExercise" ADD CONSTRAINT "StrengthExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StrengthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPhase" ADD CONSTRAINT "PlanPhase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanWeek" ADD CONSTRAINT "PlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "PlanWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_completedActivityId_fkey" FOREIGN KEY ("completedActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gear" ADD CONSTRAINT "Gear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGear" ADD CONSTRAINT "ActivityGear_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGear" ADD CONSTRAINT "ActivityGear_gearId_fkey" FOREIGN KEY ("gearId") REFERENCES "Gear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GearMaintenance" ADD CONSTRAINT "GearMaintenance_gearId_fkey" FOREIGN KEY ("gearId") REFERENCES "Gear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNutrition" ADD CONSTRAINT "DailyNutrition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionEntry" ADD CONSTRAINT "NutritionEntry_dailyId_fkey" FOREIGN KEY ("dailyId") REFERENCES "DailyNutrition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineItem" ADD CONSTRAINT "RoutineItem_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineItem" ADD CONSTRAINT "RoutineItem_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
