import postgres from 'postgres';

async function fixTicketPurchasesTable() {
  try {
    console.log("Fixing ticket_purchases table...");
    
    // Get database URL
    const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Database URL environment variable is required");
    }
    
    // Create postgres connection
    const client = postgres(databaseUrl, { 
      ssl: 'require'
    });
    
    // Check if table exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ticket_purchases'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log("ticket_purchases table doesn't exist. Creating it...");
      
      // Create ticket_purchases table
      await client`
        CREATE TABLE ticket_purchases (
          id SERIAL PRIMARY KEY,
          fundraiser_id INTEGER NOT NULL REFERENCES fundraisers(id),
          student_id INTEGER REFERENCES students(id),
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          payment_method TEXT NOT NULL,
          payment_status TEXT NOT NULL,
          payment_intent_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      console.log("ticket_purchases table created successfully.");
    } else {
      console.log("ticket_purchases table already exists.");
      
      // Check if price column exists in fundraisers table
      const priceColumnExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'fundraisers' AND column_name = 'price'
        );
      `;
      
      if (!priceColumnExists[0].exists) {
        console.log("price column doesn't exist in fundraisers table. Adding it...");
        
        // Add price column to fundraisers table
        await client`
          ALTER TABLE fundraisers ADD COLUMN price INTEGER DEFAULT 1000;
        `;
        console.log("price column added to fundraisers table.");
      } else {
        console.log("price column already exists in fundraisers table.");
      }
    }
    
    // Make student_id nullable in ticket_purchases table
    const columnNullable = await client`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'ticket_purchases' AND column_name = 'student_id';
    `;
    
    if (columnNullable.length > 0 && columnNullable[0].is_nullable === 'NO') {
      console.log("Making student_id nullable in ticket_purchases table...");
      
      await client`
        ALTER TABLE ticket_purchases ALTER COLUMN student_id DROP NOT NULL;
      `;
      console.log("student_id column is now nullable.");
    } else {
      console.log("student_id is already nullable or doesn't exist.");
    }
    
    // List all tables for verification
    const tables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log("Tables in database:", tables.map(t => t.table_name));
    
    // Close connection
    await client.end();
    console.log("Operation complete");
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixTicketPurchasesTable();