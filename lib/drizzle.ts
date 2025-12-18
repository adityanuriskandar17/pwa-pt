import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';

// ============================================
// Drizzle ORM Instance
// ============================================
// Lazy-loaded untuk menghindari error saat DATABASE_URL belum di-set

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
    if (!_db) {
        // Import pool dari lib/db.ts hanya saat dibutuhkan
        const { pool } = require('./db');
        _db = drizzle(pool, { schema, mode: 'default' });
    }
    return _db;
}

// Untuk backward compatibility
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
    get(target, prop) {
        return (getDb() as any)[prop];
    }
});

// Export schema untuk digunakan di query
export { schema };

// Export types
export type DrizzleDB = ReturnType<typeof getDb>;
