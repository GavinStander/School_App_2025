import pg from 'pg';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Get database connection URL from environment variables
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Database URL not found in environment variables');
  process.exit(1);
}

// Connect to database
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// SQL to create tables
const setupSQL = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  address TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create fundraisers table
CREATE TABLE IF NOT EXISTS fundraisers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  is_active BOOLEAN DEFAULT TRUE,
  event_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create student_fundraisers table
CREATE TABLE IF NOT EXISTS student_fundraisers (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  fundraiser_id INTEGER NOT NULL REFERENCES fundraisers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

-- Create admin user for testing
INSERT INTO users (email, username, password, role)
VALUES ('admin@example.com', 'admin', '$2b$10$Ik5TqUU5j5D9hDjVEW3oyOQxu4lZcHADMR70JJEfyqBzZRWdE5yuu', 'admin')
ON CONFLICT (email) DO NOTHING;
`;

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    await pool.query(setupSQL);
    console.log('Database setup completed successfully.');
    
    // List tables to verify
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables in database:');
    rows.forEach(row => console.log(`- ${row.table_name}`));
    
    // Verify admin user
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);
    if (userResult.rows.length > 0) {
      console.log('Admin user verified:', userResult.rows[0].email);
    } else {
      console.log('Admin user not found.');
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();