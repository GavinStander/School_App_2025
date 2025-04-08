// Script to create an admin user
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const createAdmin = async () => {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('Database URL environment variable is required');
  }
  
  console.log('Connecting to database...');
  const client = postgres(databaseUrl, { ssl: 'require' });
  const db = drizzle(client);
  
  try {
    // Check if admin user already exists
    const adminCheck = await db.execute(sql`
      SELECT * FROM users WHERE email = 'admin@example.com' OR username = 'admin'
    `);
    
    if (adminCheck.length > 0) {
      console.log('Admin user already exists. Updating password...');
      await db.execute(sql`
        UPDATE users 
        SET password = '123456' 
        WHERE email = 'admin@example.com' OR username = 'admin'
      `);
      console.log('Admin password updated to "123456"');
    } else {
      console.log('Creating admin user...');
      // Create admin user
      await db.execute(sql`
        INSERT INTO users (email, username, password, role)
        VALUES ('admin@example.com', 'admin', '123456', 'admin')
      `);
      console.log('Admin user created with email: admin@example.com, password: 123456');
    }

    // Check if school user exists
    const schoolCheck = await db.execute(sql`
      SELECT * FROM users WHERE email = 'school@example.com' OR username = 'schooluser'
    `);
    
    if (schoolCheck.length > 0) {
      console.log('School user already exists. Updating password...');
      await db.execute(sql`
        UPDATE users 
        SET password = '123456' 
        WHERE email = 'school@example.com' OR username = 'schooluser'
      `);
      console.log('School user password updated to "123456"');
    } else {
      // Create school user
      console.log('Creating school user...');
      const schoolUser = await db.execute(sql`
        INSERT INTO users (email, username, password, role)
        VALUES ('school@example.com', 'schooluser', '123456', 'school')
        RETURNING id
      `);
      
      const schoolUserId = schoolUser[0].id;
      
      // Create school record
      await db.execute(sql`
        INSERT INTO schools (name, admin_name, user_id)
        VALUES ('Example School', 'School Admin', ${schoolUserId})
      `);
      
      console.log('School user created with email: school@example.com, password: 123456');
    }

    // Check if student user exists
    const studentCheck = await db.execute(sql`
      SELECT * FROM users WHERE email = 'test@example.com' OR username = 'testuser'
    `);
    
    if (studentCheck.length > 0) {
      console.log('Student user already exists. Updating password...');
      await db.execute(sql`
        UPDATE users 
        SET password = '123456' 
        WHERE email = 'test@example.com' OR username = 'testuser'
      `);
      console.log('Student user password updated to "123456"');
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
        VALUES ('test@example.com', 'testuser', '123456', 'student')
        RETURNING id
      `);
      
      const studentUserId = studentUser[0].id;
      
      // Create student record
      await db.execute(sql`
        INSERT INTO students (school_id, user_id)
        VALUES (${schoolId}, ${studentUserId})
      `);
      
      console.log('Student user created with email: test@example.com, password: 123456');
    }

    console.log('Test accounts setup complete!');
  } catch (error) {
    console.error('Error setting up test accounts:', error);
  } finally {
    await client.end();
  }
};

createAdmin();