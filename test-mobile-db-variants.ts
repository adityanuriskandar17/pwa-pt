import mysql from 'mysql2/promise';

console.log('='.repeat(60));
console.log('🔍 TESTING MOBILE DATABASE - ALL VARIANTS');
console.log('='.repeat(60));

// Test different username/password combinations based on screenshots
const variants = [
    {
        name: 'Variant 1: From .env (current)',
        user: 'mobileDkydAA2&5E',
        password: 'ei81j[mK3c@{jQr#',
    },
    {
        name: 'Variant 2: From screenshot (with ?)',
        user: 'mobileDkydAA?&5E',
        password: 'ei8l[jmk3c{&jQr#',
    },
    {
        name: 'Variant 3: Lowercase password',
        user: 'mobileDkydAA2&5E',
        password: 'ei81j[mk3c@{jqr#',
    },
    {
        name: 'Variant 4: Screenshot user + .env password',
        user: 'mobileDkydAA?&5E',
        password: 'ei81j[mK3c@{jQr#',
    },
];

const baseConfig = {
    host: '127.0.0.1',
    port: 3308,
    database: 'mobile_database',
    connectTimeout: 10000,
};

async function testVariant(variant: any) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${variant.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log('User:', variant.user);
    console.log('Password:', variant.password.replace(/./g, '*'));

    try {
        console.log('⏳ Connecting...');
        const connection = await mysql.createConnection({
            ...baseConfig,
            user: variant.user,
            password: variant.password,
        });

        console.log('✅ CONNECTION SUCCESSFUL!');

        // Test query
        const [rows]: any = await connection.execute('SELECT DATABASE() as db, VERSION() as version');
        console.log('✅ Database:', rows[0].db);
        console.log('✅ Version:', rows[0].version);

        // List tables
        const [tables]: any = await connection.execute('SHOW TABLES');
        console.log(`✅ Tables count: ${tables.length}`);

        await connection.end();

        // Generate correct DATABASE_URL
        const userEncoded = encodeURIComponent(variant.user);
        const passwordEncoded = encodeURIComponent(variant.password);
        const correctUrl = `mysql://${userEncoded}:${passwordEncoded}@${baseConfig.host}:${baseConfig.port}/${baseConfig.database}?useSSL=false&allowPublicKeyRetrieval=true`;

        console.log('\n✅ CORRECT DATABASE_URL for .env:');
        console.log(correctUrl);

        return true;
    } catch (error: any) {
        console.error('❌ Failed');
        console.error('Error:', error.code, '-', error.message);
        return false;
    }
}

async function runTests() {
    let successVariant = null;

    for (const variant of variants) {
        const success = await testVariant(variant);
        if (success) {
            successVariant = variant;
            break; // Stop at first success
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 RESULT');
    console.log(`${'='.repeat(60)}`);

    if (successVariant) {
        console.log('✅ Found working credentials!');
        console.log('User:', successVariant.user);
        console.log('Password:', successVariant.password);
    } else {
        console.log('❌ None of the variants worked.');
        console.log('\n💡 Next steps:');
        console.log('1. Check the exact username and password in Google Cloud SQL Console');
        console.log('2. Make sure Cloud SQL Proxy is running on port 3308');
        console.log('3. Grant user permission from cloudsqlproxy host:');
        console.log('   GRANT ALL ON mobile_database.* TO \'username\'@\'cloudsqlproxy~%\';');
    }
}

runTests().catch(console.error);
