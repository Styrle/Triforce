import { PrismaClient, ResourceCategory, SportType, ContentType, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

const defaultResources: {
  id: string;
  name: string;
  description: string;
  category: ResourceCategory;
  sportType?: SportType;
  contentType: ContentType;
  duration?: number;
  instructions?: string;
  cues: string[];
  equipment: string[];
  targetAreas: string[];
  difficulty: Difficulty;
  tags: string[];
}[] = [
  // ============ STRETCHES ============
  {
    id: 'hip-flexor-stretch',
    name: 'Hip Flexor Stretch',
    description: 'Essential stretch for runners and cyclists to improve hip mobility',
    category: 'STRETCH',
    contentType: 'TEXT',
    duration: 60,
    instructions: '1. Kneel on right knee with left foot forward\n2. Push hips forward gently\n3. Keep torso upright\n4. Hold 30 seconds each side',
    cues: ['Keep torso upright', 'Squeeze glutes', 'Feel stretch in front of hip'],
    equipment: [],
    targetAreas: ['hip_flexors', 'quads'],
    difficulty: 'BEGINNER',
    tags: ['hip', 'mobility', 'running', 'cycling', 'flexibility'],
  },
  {
    id: 'hamstring-stretch',
    name: 'Lying Hamstring Stretch',
    description: 'Gentle hamstring stretch using a strap or towel',
    category: 'STRETCH',
    contentType: 'TEXT',
    duration: 60,
    instructions: '1. Lie on back\n2. Loop strap around foot\n3. Straighten leg towards ceiling\n4. Hold 30 seconds each side',
    cues: ['Keep lower back flat', 'Relax shoulders', 'Breathe deeply'],
    equipment: ['yoga strap or towel'],
    targetAreas: ['hamstrings'],
    difficulty: 'BEGINNER',
    tags: ['hamstring', 'flexibility', 'recovery'],
  },
  {
    id: 'pigeon-pose',
    name: 'Pigeon Pose',
    description: 'Deep hip opener targeting glutes and piriformis',
    category: 'STRETCH',
    contentType: 'TEXT',
    duration: 90,
    instructions: '1. From hands and knees, bring right knee forward\n2. Extend left leg back\n3. Lower hips toward floor\n4. Hold 45 seconds each side',
    cues: ['Keep hips square', 'Fold forward for deeper stretch', 'Breathe into tight spots'],
    equipment: ['yoga mat'],
    targetAreas: ['glutes', 'piriformis', 'hip_flexors'],
    difficulty: 'INTERMEDIATE',
    tags: ['hip', 'yoga', 'mobility', 'running'],
  },
  {
    id: 'calf-stretch',
    name: 'Wall Calf Stretch',
    description: 'Standing stretch for gastrocnemius and soleus',
    category: 'STRETCH',
    contentType: 'TEXT',
    duration: 60,
    instructions: '1. Face wall with hands on it\n2. Step one foot back\n3. Keep back heel down\n4. Lean into wall\n5. Hold 30 seconds each side',
    cues: ['Keep back heel grounded', 'Straight back leg for gastroc', 'Bent back leg for soleus'],
    equipment: [],
    targetAreas: ['calves', 'achilles'],
    difficulty: 'BEGINNER',
    tags: ['calf', 'running', 'flexibility'],
  },

  // ============ DRILLS - RUNNING ============
  {
    id: 'high-knees',
    name: 'High Knees',
    description: 'Running form drill focusing on knee drive and quick ground contact',
    category: 'DRILL',
    sportType: 'RUN',
    contentType: 'TEXT',
    duration: 30,
    instructions: 'Drive knees up quickly while maintaining tall posture. Focus on quick ground contact and arm drive.',
    cues: ['Quick ground contact', 'Drive arms', 'Stay tall', 'Land on forefoot'],
    equipment: [],
    targetAreas: ['hip_flexors', 'calves', 'core'],
    difficulty: 'BEGINNER',
    tags: ['running', 'warmup', 'form', 'drill'],
  },
  {
    id: 'butt-kicks',
    name: 'Butt Kicks',
    description: 'Running drill to improve hamstring activation and turnover',
    category: 'DRILL',
    sportType: 'RUN',
    contentType: 'TEXT',
    duration: 30,
    instructions: 'Jog forward while kicking heels up to touch glutes. Keep upper body relaxed.',
    cues: ['Quick heel to glute', 'Relaxed upper body', 'Stay on forefoot'],
    equipment: [],
    targetAreas: ['hamstrings', 'calves'],
    difficulty: 'BEGINNER',
    tags: ['running', 'warmup', 'form', 'drill'],
  },
  {
    id: 'a-skips',
    name: 'A-Skips',
    description: 'Classic running drill for coordination and power',
    category: 'DRILL',
    sportType: 'RUN',
    contentType: 'TEXT',
    duration: 30,
    instructions: 'Skip forward while driving one knee up high. Emphasize the down-strike and quick ground contact.',
    cues: ['Drive knee to 90 degrees', 'Quick pawback', 'Opposite arm forward', 'Stay tall'],
    equipment: [],
    targetAreas: ['hip_flexors', 'glutes', 'calves'],
    difficulty: 'INTERMEDIATE',
    tags: ['running', 'warmup', 'form', 'drill', 'power'],
  },

  // ============ DRILLS - SWIMMING ============
  {
    id: 'catch-up-drill',
    name: 'Catch-Up Drill',
    description: 'Swim drill to improve timing and stroke length',
    category: 'DRILL',
    sportType: 'SWIM',
    contentType: 'TEXT',
    duration: 120,
    instructions: 'Swim freestyle but keep one arm extended until the other arm catches up. Touch hands before starting next stroke.',
    cues: ['Full extension', 'High elbow catch', 'Rotate hips', 'Glide in streamline'],
    equipment: ['goggles', 'swimsuit'],
    targetAreas: ['shoulders', 'lats', 'core'],
    difficulty: 'BEGINNER',
    tags: ['swimming', 'technique', 'freestyle', 'drill'],
  },
  {
    id: 'fingertip-drag',
    name: 'Fingertip Drag',
    description: 'Drill to improve high elbow recovery',
    category: 'DRILL',
    sportType: 'SWIM',
    contentType: 'TEXT',
    duration: 120,
    instructions: 'Swim freestyle while dragging fingertips along the water surface during recovery. Focus on high elbow.',
    cues: ['High elbow recovery', 'Relaxed hand', 'Fingertips skim water', 'Rotate shoulders'],
    equipment: ['goggles', 'swimsuit'],
    targetAreas: ['shoulders', 'lats'],
    difficulty: 'BEGINNER',
    tags: ['swimming', 'technique', 'freestyle', 'drill'],
  },
  {
    id: 'fist-drill',
    name: 'Fist Drill',
    description: 'Drill to improve feel for the water and forearm engagement',
    category: 'DRILL',
    sportType: 'SWIM',
    contentType: 'TEXT',
    duration: 120,
    instructions: 'Swim freestyle with closed fists. Focus on catching water with forearms.',
    cues: ['Catch with forearm', 'High elbow', 'Full stroke extension', 'Open hands occasionally'],
    equipment: ['goggles', 'swimsuit'],
    targetAreas: ['forearms', 'shoulders'],
    difficulty: 'INTERMEDIATE',
    tags: ['swimming', 'technique', 'freestyle', 'drill', 'feel'],
  },

  // ============ WARMUP ============
  {
    id: 'dynamic-warmup-run',
    name: 'Dynamic Running Warmup',
    description: '5-minute pre-run activation routine',
    category: 'WARMUP',
    sportType: 'RUN',
    contentType: 'TEXT',
    duration: 300,
    instructions: '• Leg swings (30s)\n• Walking lunges (45s)\n• High knees (30s)\n• Butt kicks (30s)\n• A-skips (45s)\n• Easy jog (2min)',
    cues: ['Gradually increase intensity', 'Focus on mobility', 'Breathe rhythmically'],
    equipment: [],
    targetAreas: ['legs', 'hips', 'core'],
    difficulty: 'BEGINNER',
    tags: ['running', 'warmup', 'mobility'],
  },
  {
    id: 'dynamic-warmup-bike',
    name: 'On-Bike Warmup Protocol',
    description: '10-minute progressive cycling warmup',
    category: 'WARMUP',
    sportType: 'BIKE',
    contentType: 'TEXT',
    duration: 600,
    instructions: '• 5min Zone 1 easy spinning (90-100rpm)\n• 3min Zone 2 with cadence variations\n• 2x30s Zone 3 openers with 1min recovery',
    cues: ['Smooth pedal stroke', 'Relax upper body', 'Gradually increase effort'],
    equipment: ['bike', 'trainer or road'],
    targetAreas: ['legs', 'cardiovascular'],
    difficulty: 'BEGINNER',
    tags: ['cycling', 'warmup', 'trainer'],
  },

  // ============ COOLDOWN ============
  {
    id: 'post-run-cooldown',
    name: 'Post-Run Cool Down',
    description: '5-minute routine after running',
    category: 'COOLDOWN',
    sportType: 'RUN',
    contentType: 'TEXT',
    duration: 300,
    instructions: '• 2min easy walk\n• Standing quad stretch (30s each)\n• Hip flexor stretch (30s each)\n• Calf stretch (30s each)\n• Deep breathing',
    cues: ['Slow your breathing', 'Gentle stretches only', 'Hydrate'],
    equipment: [],
    targetAreas: ['quads', 'hip_flexors', 'calves'],
    difficulty: 'BEGINNER',
    tags: ['running', 'cooldown', 'recovery'],
  },
  {
    id: 'post-ride-cooldown',
    name: 'Post-Ride Stretching',
    description: 'Essential stretches after cycling',
    category: 'COOLDOWN',
    sportType: 'BIKE',
    contentType: 'TEXT',
    duration: 600,
    instructions: '• 3min easy spinning\n• Hip flexor stretch (60s each)\n• Pigeon pose (60s each)\n• Quad stretch (30s each)\n• Lower back stretch (60s)',
    cues: ['Flush legs with easy spinning first', 'Deep stretches for hip flexors', 'Focus on areas of tightness'],
    equipment: ['yoga mat'],
    targetAreas: ['hip_flexors', 'quads', 'glutes', 'lower_back'],
    difficulty: 'BEGINNER',
    tags: ['cycling', 'cooldown', 'recovery', 'stretching'],
  },

  // ============ STRENGTH EXERCISES ============
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    description: 'Hip extension exercise for glute activation',
    category: 'STRENGTH_EXERCISE',
    contentType: 'TEXT',
    duration: 45,
    instructions: '1. Lie on back, knees bent, feet flat\n2. Drive through heels\n3. Lift hips until body forms straight line\n4. Squeeze glutes at top\n5. Lower slowly',
    cues: ['Dont hyperextend lower back', 'Feel glutes working', 'Keep core engaged'],
    equipment: ['yoga mat'],
    targetAreas: ['glutes', 'hamstrings', 'core'],
    difficulty: 'BEGINNER',
    tags: ['strength', 'glutes', 'core', 'activation'],
  },
  {
    id: 'single-leg-deadlift',
    name: 'Single Leg Deadlift',
    description: 'Balance and posterior chain strength',
    category: 'STRENGTH_EXERCISE',
    contentType: 'TEXT',
    duration: 60,
    instructions: '1. Stand on one leg\n2. Hinge at hips, reaching hands toward floor\n3. Extend free leg behind for balance\n4. Return to standing\n5. Complete reps, then switch',
    cues: ['Keep back flat', 'Hips stay square', 'Control the movement', 'Soft knee on standing leg'],
    equipment: ['dumbbells (optional)'],
    targetAreas: ['hamstrings', 'glutes', 'balance', 'core'],
    difficulty: 'INTERMEDIATE',
    tags: ['strength', 'balance', 'running', 'stability'],
  },
  {
    id: 'plank',
    name: 'Plank',
    description: 'Core stability exercise',
    category: 'STRENGTH_EXERCISE',
    contentType: 'TEXT',
    duration: 60,
    instructions: '1. Start in push-up position\n2. Lower to forearms\n3. Keep body in straight line\n4. Engage core and hold',
    cues: ['Dont let hips sag', 'Keep neck neutral', 'Breathe normally', 'Squeeze glutes'],
    equipment: ['yoga mat'],
    targetAreas: ['core', 'shoulders'],
    difficulty: 'BEGINNER',
    tags: ['strength', 'core', 'stability'],
  },
  {
    id: 'single-leg-squat',
    name: 'Single Leg Squat',
    description: 'Unilateral leg strength for running and cycling',
    category: 'STRENGTH_EXERCISE',
    contentType: 'TEXT',
    duration: 60,
    instructions: '1. Stand on one leg\n2. Extend other leg forward\n3. Lower down by bending standing knee\n4. Go as low as comfortable\n5. Push back up',
    cues: ['Keep knee tracking over toes', 'Chest up', 'Use arms for balance', 'Control descent'],
    equipment: ['box or chair for assistance'],
    targetAreas: ['quads', 'glutes', 'balance'],
    difficulty: 'ADVANCED',
    tags: ['strength', 'legs', 'balance', 'running', 'cycling'],
  },

  // ============ MOBILITY ============
  {
    id: 'foam-roll-it-band',
    name: 'Foam Rolling - IT Band',
    description: 'Self-myofascial release for IT band',
    category: 'MOBILITY',
    contentType: 'TEXT',
    duration: 120,
    instructions: '1. Lie on side with foam roller under outer thigh\n2. Roll from hip to just above knee\n3. Pause on tender spots\n4. Roll slowly for 60s each side',
    cues: ['Use arms to control pressure', 'Breathe through discomfort', 'Avoid rolling over bone'],
    equipment: ['foam roller'],
    targetAreas: ['it_band', 'outer_thigh'],
    difficulty: 'BEGINNER',
    tags: ['mobility', 'recovery', 'running', 'cycling', 'foam rolling'],
  },
  {
    id: 'ankle-mobility',
    name: 'Ankle Mobility Drill',
    description: 'Improve ankle dorsiflexion for running and squatting',
    category: 'MOBILITY',
    contentType: 'TEXT',
    duration: 120,
    instructions: '1. Half-kneeling position facing wall\n2. Front foot 3-4 inches from wall\n3. Drive knee forward to touch wall\n4. Keep heel grounded\n5. Move foot back to increase difficulty',
    cues: ['Heel must stay down', 'Knee tracks over middle toes', 'No collapsing inward'],
    equipment: [],
    targetAreas: ['ankles', 'calves'],
    difficulty: 'BEGINNER',
    tags: ['mobility', 'ankles', 'running', 'squatting'],
  },

  // ============ RECOVERY ============
  {
    id: 'cold-bath-protocol',
    name: 'Cold Bath Protocol',
    description: 'Ice bath guidelines for recovery',
    category: 'RECOVERY',
    contentType: 'TEXT',
    duration: 600,
    instructions: '1. Fill tub with cold water (50-59°F / 10-15°C)\n2. Immerse lower body for 10-15 minutes\n3. Keep upper body warm\n4. Warm up gradually afterward',
    cues: ['Start with shorter duration', 'Never do alone', 'Have warm clothes ready'],
    equipment: ['bathtub', 'ice', 'thermometer'],
    targetAreas: ['legs', 'full_body'],
    difficulty: 'INTERMEDIATE',
    tags: ['recovery', 'cold therapy', 'performance'],
  },
];

const defaultRoutines: {
  id: string;
  name: string;
  description: string;
  category: ResourceCategory;
  sportType?: SportType;
  estimatedDuration: number;
  isSystem: boolean;
  isPublic: boolean;
}[] = [
  {
    id: 'pre-run-dynamic',
    name: 'Pre-Run Dynamic Warmup',
    description: 'Complete warmup routine before running',
    category: 'WARMUP',
    sportType: 'RUN',
    estimatedDuration: 300,
    isSystem: true,
    isPublic: true,
  },
  {
    id: 'post-ride-stretch',
    name: 'Post-Ride Stretching Routine',
    description: 'Essential stretches after cycling',
    category: 'COOLDOWN',
    sportType: 'BIKE',
    estimatedDuration: 600,
    isSystem: true,
    isPublic: true,
  },
  {
    id: 'morning-mobility',
    name: 'Morning Mobility Routine',
    description: '10-minute daily mobility for athletes',
    category: 'MOBILITY',
    estimatedDuration: 600,
    isSystem: true,
    isPublic: true,
  },
  {
    id: 'runner-strength',
    name: 'Runner Strength Circuit',
    description: 'Core strength exercises for runners',
    category: 'STRENGTH_EXERCISE',
    sportType: 'RUN',
    estimatedDuration: 900,
    isSystem: true,
    isPublic: true,
  },
];

export async function seedResources() {
  console.log('Seeding resources...');

  for (const resource of defaultResources) {
    await prisma.resource.upsert({
      where: { id: resource.id },
      update: {
        name: resource.name,
        description: resource.description,
        category: resource.category,
        sportType: resource.sportType,
        contentType: resource.contentType,
        duration: resource.duration,
        instructions: resource.instructions,
        cues: resource.cues,
        equipment: resource.equipment,
        targetAreas: resource.targetAreas,
        difficulty: resource.difficulty,
        tags: resource.tags,
      },
      create: resource,
    });
  }

  console.log(`Seeded ${defaultResources.length} resources`);

  for (const routine of defaultRoutines) {
    await prisma.routine.upsert({
      where: { id: routine.id },
      update: {
        name: routine.name,
        description: routine.description,
        category: routine.category,
        sportType: routine.sportType,
        estimatedDuration: routine.estimatedDuration,
        isSystem: routine.isSystem,
        isPublic: routine.isPublic,
      },
      create: routine,
    });
  }

  console.log(`Seeded ${defaultRoutines.length} routines`);
  console.log('Resource seeding complete!');
}

// Allow running directly
if (require.main === module) {
  seedResources()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
