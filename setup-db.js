import { exec } from 'child_process';

console.log('Starting database setup...');

// Set DATABASE_URL to NEON_DATABASE_URL for the db:push command
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;

console.log('Running: npm run db:push');
exec('npm run db:push', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
  console.log('Database schema pushed successfully!');
});