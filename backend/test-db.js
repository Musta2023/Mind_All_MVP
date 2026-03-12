const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;
console.log('Listing users in:', databaseUrl.split('@')[1]);

const pool = new Pool({
  connectionString: databaseUrl,
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('Connected!');
    
    const res = await client.query('SELECT id, email, name, role, language FROM "User"');
    console.log(`Found ${res.rows.length} users:`);
    res.rows.forEach(user => {
      console.log(`- ${user.email} (Name: ${user.name}, Role: ${user.role}, Language: ${user.language})`);
    });
    
    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

test();
