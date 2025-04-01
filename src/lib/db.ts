// lib/db.ts - Database connection utility
import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

// const serverCa = fs.readFileSync(path.join(process.cwd(), 'ssl', 'DigiCertGlobalRootG2.crt.pem'), "utf8");


// Define the pool configuration
const poolConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: {
    rejectUnauthorized: false,
    // ca: serverCa,
    // minVersion: 'TLSv1.2',
    // maxVersion: 'TLSv1.3'
  },
  timezone: 'Z',
};

// Create a pool instance
let pool = mysql.createPool(poolConfig);

// Function to reset the pool
export const resetPool = async () => {
  await pool.end();
  await new Promise(resolve => setTimeout(resolve, 1000));
  pool = mysql.createPool(poolConfig);
};

// Export both pool and resetPool
export { pool as default }; 