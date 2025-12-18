import { defineConfig } from 'drizzle-kit';

// ============================================
// Drizzle Kit Configuration for MOBILE_DATABASE
// ============================================

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
