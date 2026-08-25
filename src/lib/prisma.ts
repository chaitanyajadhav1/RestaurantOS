import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaInstance(): PrismaClient {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// In development, ensure we have a client that has all generated models
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma && (globalForPrisma.prisma as any).serviceRequest) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaInstance();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrisma();

