import { PrismaClient } from '@prisma/client';

// This is the simplest way to instantiate Prisma Client.
// It ensures that a new client is created each time this module is imported,
// which resolves the issue where the seed script was connecting to a stale or incorrect database instance.
const prisma = new PrismaClient();

export default prisma;
