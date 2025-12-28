-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LiftType" ADD VALUE 'ZERCHER_SQUAT';
ALTER TYPE "LiftType" ADD VALUE 'SAFETY_BAR_SQUAT';
ALTER TYPE "LiftType" ADD VALUE 'LEG_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'HACK_SQUAT';
ALTER TYPE "LiftType" ADD VALUE 'GOBLET_SQUAT';
ALTER TYPE "LiftType" ADD VALUE 'BULGARIAN_SPLIT_SQUAT';
ALTER TYPE "LiftType" ADD VALUE 'TRAP_BAR_DEADLIFT';
ALTER TYPE "LiftType" ADD VALUE 'STIFF_LEG_DEADLIFT';
ALTER TYPE "LiftType" ADD VALUE 'DEFICIT_DEADLIFT';
ALTER TYPE "LiftType" ADD VALUE 'BLOCK_PULL';
ALTER TYPE "LiftType" ADD VALUE 'HIP_THRUST';
ALTER TYPE "LiftType" ADD VALUE 'CLEAN';
ALTER TYPE "LiftType" ADD VALUE 'SNATCH';
ALTER TYPE "LiftType" ADD VALUE 'CLOSE_GRIP_BENCH';
ALTER TYPE "LiftType" ADD VALUE 'DUMBBELL_BENCH_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'DUMBBELL_INCLINE_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'FLOOR_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'WEIGHTED_DIP';
ALTER TYPE "LiftType" ADD VALUE 'SEATED_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'DUMBBELL_SHOULDER_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'ARNOLD_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'BEHIND_NECK_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'Z_PRESS';
ALTER TYPE "LiftType" ADD VALUE 'LAT_PULLDOWN';
ALTER TYPE "LiftType" ADD VALUE 'BARBELL_ROW';
ALTER TYPE "LiftType" ADD VALUE 'DUMBBELL_ROW';
ALTER TYPE "LiftType" ADD VALUE 'CABLE_ROW';
ALTER TYPE "LiftType" ADD VALUE 'T_BAR_ROW';
ALTER TYPE "LiftType" ADD VALUE 'BARBELL_CURL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MuscleGroup" ADD VALUE 'TIBIALIS';
ALTER TYPE "MuscleGroup" ADD VALUE 'RHOMBOIDS';
