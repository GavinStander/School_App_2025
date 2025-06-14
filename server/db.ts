import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as schema from "../shared/schema";

// Load environment variables from .env file
dotenv.config();

// Prioritize NEON_DATABASE_URL if available, otherwise use DATABASE_URL
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database connection URL environment variable is required");
}

// Create postgres connection
const client = postgres(databaseUrl, {
  ssl: "require",
});

// For debugging
console.log(
  `Connected to database at ${databaseUrl.split("@")[1].split("/")[0]}`,
);
console.log(
  `Using database URL: ${process.env.NEON_DATABASE_URL ? "NEON_DATABASE_URL" : "DATABASE_URL"}`,
);

// Create drizzle database instance
export const db = drizzle(client, { schema });
