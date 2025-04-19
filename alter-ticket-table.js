import { neon } from '@neondatabase/serverless';

// Database connection setup
const sql = neon(process.env.DATABASE_URL);

async function alterTicketPurchasesTable() {
  console.log('Altering ticket_purchases table...');
  
  try {
    // First check if table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableExists = tables.some(table => table.table_name === 'ticket_purchases');
    
    if (tableExists) {
      // Check if student_id column is NOT NULL
      const columns = await sql`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'ticket_purchases' AND column_name = 'student_id'
      `;
      
      const studentIdColumn = columns[0];
      
      if (studentIdColumn && studentIdColumn.is_nullable === 'NO') {
        console.log('Altering student_id to be nullable...');
        await sql`
          ALTER TABLE ticket_purchases 
          ALTER COLUMN student_id DROP NOT NULL
        `;
        console.log('Table altered successfully!');
      } else {
        console.log('student_id is already nullable or does not exist.');
      }
    } else {
      console.log('ticket_purchases table does not exist.');
    }
  } catch (error) {
    console.error('Error altering ticket_purchases table:', error);
  } finally {
    console.log('Operation complete');
  }
}

alterTicketPurchasesTable();