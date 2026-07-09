import { PrismaClient } from '@prisma/client';

const getDatabaseUrl = () => {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    const connectionLimit = Number(url.searchParams.get('connection_limit') ?? 0);
    const poolTimeout = Number(url.searchParams.get('pool_timeout') ?? 0);

    if (!connectionLimit || connectionLimit < 5) {
      url.searchParams.set('connection_limit', '5');
    }

    if (!poolTimeout || poolTimeout < 20) {
      url.searchParams.set('pool_timeout', '20');
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
};

// Create a singleton instance of Prisma Client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
