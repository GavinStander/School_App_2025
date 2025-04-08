// Script to create an admin user
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// This should match the hashPassword function in server/auth.ts
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

const createAdmin = async () => {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('Database URL environment variable is required');
  }
  
  console.log('Connecting to database...');
  const client = postgres(databaseUrl, { ssl: 'require' });
  const db = drizzle(client);
  
  try {
    // Hash password for all users
    const hashedPassword = await hashPassword('123456');
    console.log('Password hashed for all test users');
    
    // Check if admin user already exists
    const adminCheck = await db.execute(sql`
      SELECT * FROM users WHERE email = 'admin@example.com' OR username = 'admin'
    `);
    
    if (adminCheck.length > 0) {
      console.log('Admin user already exists. Updating password...');
      await db.execute(sql`
        UPDATE users 
        SET password = ${hashedPassword}
        WHERE email = 'admin@example.com' OR username = 'admin'
      `);
      console.log('Admin password updated');
    } else {
      console.log('Creating admin user...');
      // Create admin user
      await db.execute(sql`
        INSERT INTO users (email, username, password, role)
        VALUES ('admin@example.com', 'admin', ${hashedPassword}, 'admin')
      `);
      console.log('Admin user created with email: admin@example.com');
    }

    // Check if school user exists
    const schoolCheck = await db.execute(sql`
      SELECT * FROM users WHERE email = 'school@example.com' OR username = 'schooluser'
    `);
    
    if (schoolCheck.length > 0) {
      console.log('School user already exists. Updating password...');
      await db.execute(sql`
        UPDATE users 
        SET password = ${hashedPassword}
        WHERE email = 'school@example.com' OR username = 'schooluser'
      `);
      console.log('School user password updated');
    } else {
      // Create school user
      console.log('Creating school user...');
      const schoolUser = await db.execute(sql`
        INSERT INTO users (email, username, password, role)
        VALUES ('school@example.com', 'schooluser', ${hashedPassword}, 'school')
        RETURNING id
      `);
      
      const schoolUserId = schoolUser[0].id;
      
      // Create school record
      await db.execute(sql`
        INSERT INTO schools (name, admin_name, user_id)
        VALUES ('Example School', 'School Admin', ${schoolUserId})
      `);
      
      console.log('School user created with email: school@example.com');
    }

    // Check if student user exists
    const studentCheck = await db.execute(sql`
      SELECT * FROM users WHERE email = 'test@example.com' OR username = 'testuser'
    `);
    
    if (studentCheck.length > 0) {
      console.log('Student user already exists. Updating password...');
      await db.execute(sql`
        UPDATE users 
        SET password = ${hashedPassword}
        WHERE email = 'test@example.com' OR username = 'testuser'
      `);
      console.log('Student user password updated');
    } else {
      // Get the first school
      const schoolsResult = await db.execute(sql`
        SELECT id FROM schools LIMIT 1
      `);
      
      if (schoolsResult.length === 0) {
        console.log('No schools found! Please create a school first.');
        return;
      }
      
      const schoolId = schoolsResult[0].id;
      
      // Create student user
      console.log('Creating student user...');
      const studentUser = await db.execute(sql`
        INSERT INTO users (email, username, password, role)
        VALUES ('test@example.com', 'testuser', ${hashedPassword}, 'student')
        RETURNING id
      `);
      
      const studentUserId = studentUser[0].id;
      
      // Create student record
      await db.execute(sql`
        INSERT INTO students (school_id, user_id)
        VALUES (${schoolId}, ${studentUserId})
      `);
      
      console.log('Student user created with email: test@example.com');
    }

    console.log('Test accounts setup complete! All passwords set to "123456"');
  } catch (error) {
    console.error('Error setting up test accounts:', error);
  } finally {
    await client.end();
  }
};

createAdmin().catch(console.error);