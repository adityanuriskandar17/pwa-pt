import mysql from 'mysql2/promise';

console.log('='.repeat(60));
console.log('🔍 TESTING ALL DATABASE CONFIGURATIONS');
console.log('='.repeat(60));

// Test configurations from your .env comments
const configs = [
    {
        name: 'Mobile Database (Current)',
        user: 'mobileDkydAA2&5E',
        password: 'ei81j[mK3c@{jQr#',
        host: '127.0.0.1',
        port: 3308,
        database: 'mobile_database',
    },
    {
        name: 'FTLG Master v1',
        user: 'SYS483D736FEC',
        password: '3SQljD378MQof67EjHYT',
        host: '10.0.1.100',
        port: 3307,
        database: 'ftlg_master',
    },
    {
        name: 'FTLG Master v2',
        user: 'ADITYA_21BC9E0D45',
        password: 'S2t8YpVqPXk6wGwkC4sQ',
        host: '127.0.0.1',
        port: 5000,
        database: 'ftlg_master',
    },
];

async function testConfig(config: any) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Testing: ${config.name}`);
    console.log(`${'='.repeat(60)}`);
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

        // Test query
        const [rows]: any = await connection.execute('SELECT DATABASE() as current_db, VERSION() as version, USER() as current_user');
        console.log('✅ Query successful:');
        console.log('  - Current database:', rows[0].current_db);
        console.log('  - MySQL version:', rows[0].version);
        console.log('  - Current user:', rows[0].current_user);

        // List tables
        const [tables]: any = await connection.execute('SHOW TABLES');
        console.log(`  - Tables count: ${tables.length}`);
        if (tables.length > 0) {
            console.log('  - Sample tables:', tables.slice(0, 5).map((t: any) => Object.values(t)[0]).join(', '));
        }

        await connection.end();
        console.log('✅ Connection closed');

        return true;
    } catch (error: any) {
        console.error('❌ Connection failed');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Tip: Server is not running or wrong host/port');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('💡 Tip: Host is unreachable or firewall blocking');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('💡 Tip: Wrong username/password or user lacks permission from this host');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('💡 Tip: Database does not exist');
        }

        return false;
    }
}

async function runAllTests() {
    const results: any[] = [];

    for (const config of configs) {
        const success = await testConfig(config);
        results.push({ name: config.name, success });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 SUMMARY');
    console.log(`${'='.repeat(60)}`);

    results.forEach(r => {
        console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`\nTotal: ${successCount}/${results.length} configurations working`);

    if (successCount === 0) {
        console.log('\n⚠️  No configurations worked. Please check:');
        console.log('1. Are the MySQL servers running?');
        console.log('2. Are the credentials correct?');
        console.log('3. Is there a Cloud SQL Proxy running for cloud databases?');
        console.log('4. Are firewalls allowing the connections?');
    }
}

runAllTests().catch(console.error);
