import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Use NEON_DATABASE_URL if available, otherwise fallback to DATABASE_URL
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database connection URL environment variable is required");
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
