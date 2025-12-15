import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@/drizzle/schema';

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Parse DATABASE_URL untuk extract config
const parseDatabaseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 3306,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1), // Remove leading '/'
    };
  } catch {
    // Fallback: jika DATABASE_URL sudah dalam format connection string
    return undefined;
  }
};

const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL || '');

// Create connection pool dengan optimasi untuk performa maksimal
export const connection = mysql.createPool(
  dbConfig || process.env.DATABASE_URL,
  {
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
    
    // Reuse connections
    reuseConnection: true,
    
    // MySQL specific optimizations
    multipleStatements: false, // Security: disable multiple statements
    dateStrings: false, // Return dates as Date objects, not strings
    supportBigNumbers: true, // Support BIGINT
    bigNumberStrings: false, // Return BIGINT as numbers, not strings
  }
);

// Create Drizzle instance
export const db = drizzle(connection, { schema, mode: 'default' });

// Export schema for use in queries
export { schema };





