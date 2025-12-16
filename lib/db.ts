import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@/drizzle/schema';

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} environment variable is not set`);
  }
}

// Database configuration from individual env vars
const dbConfig = {
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
};

// Create connection pool dengan optimasi untuk performa maksimal
export const connection = mysql.createPool({
  ...dbConfig,
  
  // Connection pool settings (WAJIB untuk performa)
  waitForConnections: true, // Tunggu jika semua connection sedang dipakai
  connectionLimit: 20, // Increase limit untuk handle concurrent requests
  queueLimit: 0, // Unlimited queue (jangan reject request)
  
  // Keep-alive settings
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // Timeout settings
  connectTimeout: 10000, // 10 detik timeout untuk connect
  acquireTimeout: 60000, // 60 detik timeout untuk acquire connection dari pool
  
  // MySQL specific optimizations
  multipleStatements: false, // Security: disable multiple statements
  dateStrings: false, // Return dates as Date objects, not strings
  supportBigNumbers: true, // Support BIGINT
  bigNumberStrings: false, // Return BIGINT as numbers, not strings
});

// Create Drizzle instance
export const db = drizzle(connection, { schema, mode: 'default' });

// Export schema for use in queries
export { schema };









