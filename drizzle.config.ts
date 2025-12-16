import { defineConfig } from 'drizzle-kit';

// For drizzle-kit commands, use: npx drizzle-kit generate
// Environment variables are loaded from .env by drizzle-kit automatically

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  },
});









