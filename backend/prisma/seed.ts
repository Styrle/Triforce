import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123456', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@triforce.app' },
    update: {},
    create: {
      email: 'demo@triforce.app',
      passwordHash,
      name: 'Demo Athlete',
      settings: {
        create: {
          units: 'METRIC',
          weekStartDay: 1,
          timezone: 'UTC',
        },
      },
      profile: {
        create: {
          sex: 'MALE',
          weight: 75,
          height: 180,
          ftp: 250,
          lthr: 170,
          thresholdPace: 4.17, // ~4:00/km
          css: 1.25, // ~1:20/100m
          maxHr: 185,
          restingHr: 50,
        },
      },
    },
    include: {
      settings: true,
      profile: true,
    },
  });

  console.log(`Created demo user: ${demoUser.email}`);

  // Create some sample activities
  const activities = [
    {
      name: 'Morning Run',
      sportType: 'RUN' as const,
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      elapsedTime: 3600,
      movingTime: 3500,
      distance: 10000,
      avgHeartRate: 145,
      maxHeartRate: 165,
      avgSpeed: 2.86,
      tss: 65,
    },
    {
      name: 'Long Ride',
      sportType: 'BIKE' as const,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      elapsedTime: 7200,
      movingTime: 7000,
      distance: 60000,
      avgHeartRate: 135,
      maxHeartRate: 155,
      avgPower: 180,
      normalizedPower: 195,
      tss: 120,
    },
    {
      name: 'Pool Swim',
      sportType: 'SWIM' as const,
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      elapsedTime: 3600,
      movingTime: 3400,
      distance: 3000,
      poolLength: 25,
      tss: 45,
    },
  ];

  for (const activityData of activities) {
    await prisma.activity.create({
      data: {
        userId: demoUser.id,
        ...activityData,
      },
    });
  }

  console.log(`Created ${activities.length} sample activities`);

  // Create daily metrics
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const tss = Math.floor(Math.random() * 100) + 20;
    const prevMetrics = i < 30 
      ? await prisma.dailyMetrics.findFirst({
          where: { userId: demoUser.id },
          orderBy: { date: 'desc' },
        })
      : null;

    const prevCtl = prevMetrics?.ctl || 50;
    const prevAtl = prevMetrics?.atl || 50;

    const ctl = prevCtl + (tss - prevCtl) / 42;
    const atl = prevAtl + (tss - prevAtl) / 7;
    const tsb = ctl - atl;

    await prisma.dailyMetrics.upsert({
      where: { userId_date: { userId: demoUser.id, date } },
      update: { tss, ctl, atl, tsb },
      create: {
        userId: demoUser.id,
        date,
        tss,
        ctl,
        atl,
        tsb,
        activityCount: Math.random() > 0.3 ? 1 : 0,
      },
    });
  }

  console.log('Created 30 days of daily metrics');

  // Create sample workout templates
  const templates = [
    {
      name: 'Easy Run',
      sportType: 'RUN' as const,
      workoutType: 'RECOVERY' as const,
      estimatedDuration: 2700,
      estimatedTss: 30,
      category: 'recovery',
      difficulty: 'easy',
      isPublic: true,
    },
    {
      name: 'Tempo Run',
      sportType: 'RUN' as const,
      workoutType: 'TEMPO' as const,
      estimatedDuration: 3600,
      estimatedTss: 70,
      category: 'threshold',
      difficulty: 'moderate',
      isPublic: true,
    },
    {
      name: 'Sweet Spot Intervals',
      sportType: 'BIKE' as const,
      workoutType: 'INTERVALS' as const,
      estimatedDuration: 3600,
      estimatedTss: 75,
      category: 'threshold',
      difficulty: 'hard',
      isPublic: true,
      isStructured: true,
      structure: {
        steps: [
          { type: 'warmup', duration: 600, intensity: 0.5 },
          { type: 'interval', workDuration: 480, restDuration: 120, repeat: 4, intensity: 0.88 },
          { type: 'cooldown', duration: 600, intensity: 0.5 },
        ],
      },
    },
    {
      name: 'CSS Intervals',
      sportType: 'SWIM' as const,
      workoutType: 'INTERVALS' as const,
      estimatedDuration: 3600,
      estimatedTss: 55,
      category: 'threshold',
      difficulty: 'moderate',
      isPublic: true,
    },
  ];

  for (const template of templates) {
    await prisma.workoutTemplate.create({
      data: template,
    });
  }

  console.log(`Created ${templates.length} workout templates`);

  console.log('Seeding complete!');
  console.log('\nDemo account credentials:');
  console.log('Email: demo@triforce.app');
  console.log('Password: demo123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
