import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

// Database connection setup
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function setupTicketPurchasesTable() {
  console.log('Setting up ticket_purchases table...');
  
  try {
    // First check if table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableExists = tables.some(table => table.table_name === 'ticket_purchases');
    
    if (!tableExists) {
      console.log('Creating ticket_purchases table...');
      await sql`
        CREATE TABLE IF NOT EXISTS ticket_purchases (
          id SERIAL PRIMARY KEY,
          fundraiser_id INTEGER NOT NULL,
          student_id INTEGER,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(50),
          quantity INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          payment_intent_id VARCHAR(255) NOT NULL,
          payment_status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('ticket_purchases table created successfully!');
    } else {
      console.log('ticket_purchases table already exists.');
    }
  } catch (error) {
    console.error('Error setting up ticket_purchases table:', error);
  } finally {
    // neon client doesn't need explicit closing
    console.log('Operation complete');
  }
}

setupTicketPurchasesTable();