import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma2 = global as unknown as { prisma2: PrismaClient };

function getPrisma() {
  if (!globalForPrisma2.prisma2) {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    globalForPrisma2.prisma2 = new PrismaClient({ adapter });
  }
  return globalForPrisma2.prisma2;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  }
});

if (process.env.NODE_ENV !== 'production') {
  // We don't assign globalForPrisma.prisma here directly to maintain lazy loading
  // It will be assigned inside getPrisma() upon first use.
}

