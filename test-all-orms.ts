import dotenv from 'dotenv';
dotenv.config();

// Update DATABASE_URL with correct credentials
process.env.DATABASE_URL = "mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true";

import mysql from 'mysql2/promise';

console.log('='.repeat(60));
console.log('🔍 TESTING ALL ORMs WITH CORRECT CREDENTIALS');
console.log('='.repeat(60));

// Test 1: mysql2 (raw driver)
async function testMysql2() {
    console.log('\n📋 Test 1: mysql2 (Raw Driver)');
    console.log('='.repeat(60));

    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3308,
            user: 'mobileDkydAA?&5E',
            password: 'ei8l[jmk3c{&jQr#',
            database: 'mobile_database',
        });

        const [rows]: any = await connection.execute('SELECT DATABASE() as db, COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()');
        console.log('✅ mysql2 connection successful!');
        console.log(`   Database: ${rows[0].db}, Tables: ${rows[0].count}`);

        await connection.end();
        return true;
    } catch (error: any) {
        console.error('❌ mysql2 failed:', error.message);
        return false;
    }
}

// Test 2: lib/db.ts pool
async function testLibDb() {
    console.log('\n📋 Test 2: lib/db.ts (mysql2 pool)');
    console.log('='.repeat(60));

    try {
        const { pool, testConnection } = await import('./lib/db');
        const result = await testConnection();

        if (result) {
            const [rows]: any = await pool.execute('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()');
            console.log('✅ lib/db.ts pool successful!');
            console.log(`   Tables: ${rows[0].count}`);
            await pool.end();
            return true;
        } else {
            console.error('❌ lib/db.ts pool failed');
            return false;
        }
    } catch (error: any) {
        console.error('❌ lib/db.ts failed:', error.message);
        return false;
    }
}

// Test 3: Drizzle ORM
async function testDrizzle() {
    console.log('\n📋 Test 3: Drizzle ORM');
    console.log('='.repeat(60));

    try {
        const { drizzle } = await import('drizzle-orm/mysql2');
        const mysql2 = await import('mysql2/promise');

        const connection = await mysql2.createConnection({
            host: '127.0.0.1',
            port: 3308,
            user: 'mobileDkydAA?&5E',
            password: 'ei8l[jmk3c{&jQr#',
            database: 'mobile_database',
        });

        const db = drizzle(connection);

        // Test query
        const [rows]: any = await connection.execute('SELECT DATABASE() as db');
        console.log('✅ Drizzle ORM successful!');
        console.log(`   Database: ${rows[0].db}`);

        await connection.end();
        return true;
    } catch (error: any) {
        console.error('❌ Drizzle ORM failed:', error.message);
        return false;
    }
}

// Test 4: Prisma
async function testPrisma() {
    console.log('\n📋 Test 4: Prisma ORM');
    console.log('='.repeat(60));

    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        });

        await prisma.$connect();

        // Test query
        const result = await prisma.$queryRaw`SELECT DATABASE() as db`;
        console.log('✅ Prisma ORM successful!');
        console.log('   Connected to database');

        await prisma.$disconnect();
        return true;
    } catch (error: any) {
        console.error('❌ Prisma ORM failed:', error.message);
        return false;
    }
}

// Test 5: Sequelize
async function testSequelize() {
    console.log('\n📋 Test 5: Sequelize ORM');
    console.log('='.repeat(60));

    try {
        const { Sequelize } = await import('sequelize');

        const sequelize = new Sequelize({
            dialect: 'mysql',
            host: '127.0.0.1',
            port: 3308,
            username: 'mobileDkydAA?&5E',
            password: 'ei8l[jmk3c{&jQr#',
            database: 'mobile_database',
            logging: false,
        });

        await sequelize.authenticate();
        console.log('✅ Sequelize ORM successful!');
        console.log('   Connection authenticated');

        await sequelize.close();
        return true;
    } catch (error: any) {
        console.error('❌ Sequelize ORM failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    const results = {
        mysql2: await testMysql2(),
        libDb: await testLibDb(),
        drizzle: await testDrizzle(),
        prisma: await testPrisma(),
        sequelize: await testSequelize(),
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));

    Object.entries(results).forEach(([name, success]) => {
        console.log(`${success ? '✅' : '❌'} ${name.padEnd(15)} - ${success ? 'WORKING' : 'FAILED'}`);
    });

    const successCount = Object.values(results).filter(Boolean).length;
    console.log(`\nTotal: ${successCount}/${Object.keys(results).length} working`);

    if (results.libDb) {
        console.log('\n💡 RECOMMENDATION:');
        console.log('Your lib/db.ts is working! Update your .env with:');
        console.log('DATABASE_URL="mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true"');
    }
}

runAllTests().catch(console.error);
