// lib/db.ts - Database connection utility
import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

// Create a connection pool
// const serverCa = fs.readFileSync(path.join(process.cwd(), 'ssl', 'DigiCertGlobalRootG2.crt.pem'), "utf8");
const pool = mysql.createPool({
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
});

export default pool; 