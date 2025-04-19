const { Pool } = require('pg');
require('dotenv').config();

async function alterTicketPurchasesTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Starting migration: Adding new columns to ticket_purchases table...');
    
    // Add new columns if they don't exist
    await pool.query(`
      ALTER TABLE ticket_purchases 
      ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit_card',
      ADD COLUMN IF NOT EXISTS student_email TEXT,
      ADD COLUMN IF NOT EXISTS ticket_info TEXT;
    `);
    
    console.log('Migration successful: New columns added to ticket_purchases table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

alterTicketPurchasesTable();