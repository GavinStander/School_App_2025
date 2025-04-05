import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';
import * as schema from "../shared/schema";

// Use NEON_DATABASE_URL if available, otherwise fallback to DATABASE_URL
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database connection URL environment variable is required");
}

// Create postgres connection
const client = postgres(databaseUrl, { ssl: 'require' });

// Create drizzle database instance
export const db = drizzle(client, { schema });
