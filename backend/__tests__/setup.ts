import { prisma } from '../src/config/database';

// Increase timeout for database operations
jest.setTimeout(30000);

// Clean up database before tests
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Optional: Reset database between test suites
// This can be slow, so use judiciously
export async function resetDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

// Helper to create test user
export async function createTestUser(data?: {
  email?: string;
  password?: string;
  name?: string;
}) {
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(data?.password || 'testpass123', 10);

  return prisma.user.create({
    data: {
      email: data?.email || `test-${Date.now()}@example.com`,
      passwordHash,
      name: data?.name || 'Test User',
      settings: { create: {} },
      profile: { create: {} },
    },
    include: {
      settings: true,
      profile: true,
    },
  });
}

// Helper to generate auth token
export function generateTestToken(user: { id: string; email: string }) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' } as { expiresIn: string }
  );
}
