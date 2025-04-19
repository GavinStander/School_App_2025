import { neon } from '@neondatabase/serverless';

// Database connection setup
const sql = neon(process.env.DATABASE_URL);

async function addPriceColumnToFundraisers() {
  console.log('Adding price column to fundraisers table...');
  
  try {
    // First check if column exists
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'fundraisers' AND column_name = 'price'
    `;
    
    const priceColumnExists = columns.length > 0;
    
    if (!priceColumnExists) {
      console.log('Adding price column...');
      await sql`
        ALTER TABLE fundraisers 
        ADD COLUMN price integer DEFAULT 1000 NOT NULL
      `;
      console.log('Price column added successfully!');
    } else {
      console.log('Price column already exists.');
      
      // Update fundraisers to ensure they all have prices
      await sql`
        UPDATE fundraisers
        SET price = 1000
        WHERE price IS NULL OR price = 0
      `;
      console.log('Updated any missing prices to default value (1000 cents).');
    }
    
    // Show current fundraiser data
    const fundraisers = await sql`SELECT * FROM fundraisers`;
    console.log('Current fundraisers:', fundraisers);
    
  } catch (error) {
    console.error('Error modifying fundraisers table:', error);
  } finally {
    console.log('Operation complete');
  }
}

addPriceColumnToFundraisers();