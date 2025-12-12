import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@/drizzle/schema';

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool dengan optimasi untuk performa
export const connection = mysql.createPool(process.env.DATABASE_URL, {
  connectionLimit: 10, // Limit koneksi simultan
  queueLimit: 0, // Unlimited queue
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Create Drizzle instance
export const db = drizzle(connection, { schema, mode: 'default' });

// Export schema for use in queries
export { schema };
