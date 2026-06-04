import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Strip ?pgbouncer=true from the URL — that flag is for the classic Prisma
// engine only and causes PostgreSQL to reject the connection when using
// the @prisma/adapter-pg driver adapter (pg package).
const connectionString = process.env.DATABASE_URL!
  .replace("?pgbouncer=true", "")
  .replace("&pgbouncer=true", "");

const adapter = new PrismaPg({
  connectionString,
  // Limit pool size to avoid exhausting Supabase's connection quota.
  max: process.env.NODE_ENV === "production" ? 5 : 2,
  // Fail fast instead of hanging for 20+ seconds when connections are unavailable.
  connectionTimeoutMillis: 6000,
  idleTimeoutMillis: 30000,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
