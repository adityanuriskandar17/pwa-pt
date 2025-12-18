import mysql from 'mysql2/promise';

const config = {
    name: 'FTLG Master v2',
    user: 'ADITYA_21BC9E0D45',
    password: 'S2t8YpVqPXk6wGwkC4sQ',
    host: '127.0.0.1',
    port: 5000,
    database: 'ftlg_master',
};

async function testConnection() {
    console.log('='.repeat(60));
    console.log('🔍 TESTING FTLG MASTER V2 CONNECTION');
    console.log('='.repeat(60));
    console.log('Host:', config.host);
    console.log('Port:', config.port);
    console.log('User:', config.user);
    console.log('Database:', config.database);

    try {
        console.log('\n⏳ Connecting...');
        const connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            connectTimeout: 10000,
        });

        console.log('✅ Connection successful!');

        // Test with MariaDB compatible query
        const [rows1]: any = await connection.execute('SELECT DATABASE() as current_db');
        console.log('✅ Current database:', rows1[0].current_db);

        const [rows2]: any = await connection.execute('SELECT VERSION() as version');
        console.log('✅ Database version:', rows2[0].version);

        const [rows3]: any = await connection.execute('SELECT USER() as user_name');
        console.log('✅ Current user:', rows3[0].user_name);

        // List tables
        const [tables]: any = await connection.execute('SHOW TABLES');
        console.log(`✅ Tables count: ${tables.length}`);

        if (tables.length > 0) {
            console.log('\n📋 Available tables:');
            tables.forEach((table: any, index: number) => {
                const tableName = Object.values(table)[0];
                console.log(`  ${index + 1}. ${tableName}`);
            });
        }

        await connection.end();
        console.log('\n✅ Connection test completed successfully!');
        console.log('='.repeat(60));

        return true;
    } catch (error: any) {
        console.error('❌ Connection failed');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        return false;
    }
}

// Now test Mobile Database with more details
async function testMobileDatabase() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TESTING MOBILE DATABASE (Detailed)');
    console.log('='.repeat(60));

    const mobileConfig = {
        user: 'mobileDkydAA2&5E',
        password: 'ei81j[mK3c@{jQr#',
        host: '127.0.0.1',
        port: 3308,
        database: 'mobile_database',
    };

    console.log('Host:', mobileConfig.host);
    console.log('Port:', mobileConfig.port);
    console.log('User:', mobileConfig.user);
    console.log('Database:', mobileConfig.database);

    try {
        console.log('\n⏳ Connecting...');
        const connection = await mysql.createConnection({
            host: mobileConfig.host,
            port: mobileConfig.port,
            user: mobileConfig.user,
            password: mobileConfig.password,
            database: mobileConfig.database,
            connectTimeout: 10000,
        });

        console.log('✅ Connection successful!');

        const [rows]: any = await connection.execute('SELECT DATABASE() as current_db');
        console.log('✅ Current database:', rows[0].current_db);

        await connection.end();
        console.log('✅ Mobile database connection works!');

        return true;
    } catch (error: any) {
        console.error('❌ Connection failed');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Troubleshooting Access Denied Error:');
            console.log('1. Check if username is correct: mobileDkydAA2&5E');
            console.log('2. Check if password is correct');
            console.log('3. Check user permissions in MySQL:');
            console.log('   - Login to MySQL as root/admin');
            console.log('   - Run: SELECT user, host FROM mysql.user WHERE user LIKE \'mobile%\';');
            console.log('   - Check if user has permission from your IP or \'%\'');
            console.log('4. If using Cloud SQL Proxy, check if proxy is running on port 3308');
            console.log('5. The error shows host as \'cloudsqlproxy~103.76.12.150\'');
            console.log('   This suggests Cloud SQL Proxy is running but user lacks permission');
        }

        return false;
    }
}

async function runTests() {
    const ftlgWorks = await testConnection();
    const mobileWorks = await testMobileDatabase();

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`FTLG Master v2 (port 5000): ${ftlgWorks ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`Mobile Database (port 3308): ${mobileWorks ? '✅ WORKING' : '❌ FAILED'}`);

    if (ftlgWorks && !mobileWorks) {
        console.log('\n💡 RECOMMENDATION:');
        console.log('FTLG Master v2 is working. You can:');
        console.log('1. Use FTLG Master v2 instead of Mobile Database');
        console.log('2. Or fix the Mobile Database user permissions');
        console.log('\nTo use FTLG Master v2, update your .env:');
        console.log('DATABASE_URL="mysql://ADITYA_21BC9E0D45:S2t8YpVqPXk6wGwkC4sQ@127.0.0.1:5000/ftlg_master"');
    }

    console.log('='.repeat(60));
}

runTests().catch(console.error);
