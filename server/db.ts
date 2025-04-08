import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';
import * as schema from "../shared/schema";

// Use NEON_DATABASE_URL for database connection
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database connection URL environment variable is required");
}

// Create postgres connection
const client = postgres(databaseUrl, { ssl: 'require' });

// For debugging
console.log(`Connected to database at ${databaseUrl.split("@")[1].split("/")[0]}`);

// Create drizzle database instance
export const db = drizzle(client, { schema });
