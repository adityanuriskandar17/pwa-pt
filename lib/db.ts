import mysql from 'mysql2/promise';

// ============================================
// MOBILE_DATABASE Configuration - Direct mysql2
// ============================================

// Parse DATABASE_URL
const parseDbUrl = (url: string) => {
  const cleanUrl = url.split('?')[0];
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = cleanUrl.match(regex);
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    user: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
};

// Get config
const getConfig = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable must be set');
  }
  const config = parseDbUrl(process.env.DATABASE_URL);
  console.log('DB Config:', { host: config.host, port: config.port, database: config.database, user: config.user });
  return config;
};

const dbConfig = getConfig();

// Create connection pool
export const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  
  // Pool settings
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  
  // Keep-alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // Timeout
  connectTimeout: 10000,
  
  // MySQL options
  multipleStatements: false,
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
});

// Helper function untuk query
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

// Helper function untuk query single row
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper function untuk execute (INSERT, UPDATE, DELETE)
export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export default pool;

