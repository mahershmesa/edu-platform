import { PrismaClient } from "@prisma/client";

function createClient() {
  // File bytes (MediaFile.data) are only loaded where explicitly requested.
  return new PrismaClient({ omit: { mediaFile: { data: true } } });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
