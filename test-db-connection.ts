import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables FIRST before importing anything else
dotenv.config();

async function runTests() {
    console.log('='.repeat(60));
    console.log('🔍 TESTING DATABASE CONNECTION');
    console.log('='.repeat(60));

    // Test 1: Environment Variables
    console.log('\n📋 Test 1: Environment Variables');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not Set');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set in .env file');
        console.log('\nPlease check:');
        console.log('1. .env file exists in project root');
        console.log('2. DATABASE_URL is defined in .env');
        console.log('3. .env file is not corrupted');
        process.exit(1);
    }

    if (process.env.DATABASE_URL) {
        // Parse URL untuk debug (tanpa password)
        const urlParts = process.env.DATABASE_URL.split('@');
        if (urlParts.length > 1) {
            const [protocol, hostPart] = [urlParts[0].split('//')[0], urlParts[1]];
            console.log('Protocol:', protocol);
            console.log('Host part:', hostPart);
        }
    }

    // Test 2: Parse DATABASE_URL
    console.log('\n📋 Test 2: Parsing DATABASE_URL');
    let config: any;
    try {
        const cleanUrl = process.env.DATABASE_URL!.split('?')[0];
        const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
        const match = cleanUrl.match(regex);

        if (!match) {
            console.error('❌ Failed to parse DATABASE_URL');
            console.log('Clean URL:', cleanUrl);
            console.log('\nExpected format: mysql://user:password@host:port/database');
            process.exit(1);
        } else {
            config = {
                user: decodeURIComponent(match[1]),
                password: decodeURIComponent(match[2]),
                host: match[3],
                port: parseInt(match[4]),
                database: match[5],
            };
            console.log('✅ Parsed successfully:');
            console.log('  - User:', config.user);
            console.log('  - Password:', config.password.replace(/./g, '*'));
            console.log('  - Host:', config.host);
            console.log('  - Port:', config.port);
            console.log('  - Database:', config.database);
        }
    } catch (error) {
        console.error('❌ Error parsing:', error);
        process.exit(1);
    }

    // Test 3: Direct mysql2 connection
    console.log('\n📋 Test 3: Direct mysql2 Connection');
    try {
        console.log('Attempting connection to', config.host + ':' + config.port);
        console.log('Timeout: 10 seconds');

        const connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            connectTimeout: 10000,
        });

        console.log('✅ Direct connection successful!');

        // Test simple query
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ Test query successful:', rows);

        // Get database info
        const [dbInfo]: any = await connection.execute('SELECT DATABASE() as current_db, VERSION() as version');
        console.log('✅ Database info:');
        console.log('  - Current database:', dbInfo[0].current_db);
        console.log('  - MySQL version:', dbInfo[0].version);

        await connection.end();
        console.log('✅ Connection closed successfully');
    } catch (error: any) {
        console.error('❌ Direct connection failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error errno:', error.errno);
        console.error('Error sqlState:', error.sqlState);

        // Provide helpful troubleshooting tips
        console.log('\n🔧 Troubleshooting tips:');

        if (error.code === 'ECONNREFUSED') {
            console.log('- Connection refused. Possible causes:');
            console.log('  1. MySQL server is not running');
            console.log('  2. Wrong host or port');
            console.log('  3. Firewall blocking the connection');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('- Connection timeout. Possible causes:');
            console.log('  1. Host is unreachable');
            console.log('  2. Network issues');
            console.log('  3. Firewall blocking the connection');
            console.log('  4. For Cloud SQL: IP not in authorized networks');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('- Access denied. Possible causes:');
            console.log('  1. Wrong username or password');
            console.log('  2. User does not have access to the database');
            console.log('  3. User does not have permission from this host');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('- Database does not exist');
            console.log('  1. Check database name spelling');
            console.log('  2. Create the database if it does not exist');
        }

        process.exit(1);
    }

    // Test 4: Now test with the pool from lib/db.ts
    console.log('\n📋 Test 4: Testing lib/db.ts pool');
    try {
        const { pool, testConnection } = await import('./lib/db');
        const result = await testConnection();
        console.log('Result:', result ? '✅ Success' : '❌ Failed');

        // Test simple query via pool
        console.log('\n📋 Test 5: Simple Query via Pool');
        const [rows] = await pool.execute('SELECT 1 as test');
        console.log('✅ Query successful:', rows);

        await pool.end();
    } catch (error: any) {
        console.error('❌ Pool test failed:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Tests completed');
    console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
