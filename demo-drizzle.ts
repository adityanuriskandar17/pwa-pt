import dotenv from 'dotenv';
dotenv.config();

// Update DATABASE_URL with correct credentials
process.env.DATABASE_URL = "mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true";

import { db, schema } from './lib/drizzle';
import { eq, desc } from 'drizzle-orm';

console.log('='.repeat(60));
console.log('🎉 DRIZZLE ORM - MOBILE_DATABASE');
console.log('='.repeat(60));

async function demonstrateDrizzle() {
    try {
        // Query 1: Get trainers
        console.log('\n✅ Query 1: Active Trainers');
        const trainers = await db
            .select({
                id: schema.frUser.id,
                name: schema.frUser.firstName,
                email: schema.frUser.email,
            })
            .from(schema.frUser)
            .where(eq(schema.frUser.status, 'active'))
            .limit(3);

        console.log(`Found ${trainers.length} trainers:`);
        trainers.forEach(t => console.log(`  - ${t.name} (${t.email})`));

        // Query 2: Get members
        console.log('\n✅ Query 2: Members');
        const members = await db
            .select({
                id: schema.member.id,
                fullname: schema.member.fullname,
                email: schema.member.email,
            })
            .from(schema.member)
            .limit(3);

        console.log(`Found ${members.length} members:`);
        members.forEach(m => console.log(`  - ${m.fullname} (${m.email})`));

        // Query 3: Get recent bookings
        console.log('\n✅ Query 3: Recent Bookings');
        const bookings = await db
            .select({
                resourceName: schema.listBooking.resourceName,
                clubName: schema.listBooking.clubName,
                day: schema.listBooking.day,
            })
            .from(schema.listBooking)
            .orderBy(desc(schema.listBooking.day))
            .limit(3);

        console.log(`Found ${bookings.length} bookings:`);
        bookings.forEach(b => console.log(`  - ${b.resourceName} at ${b.clubName} on ${b.day}`));

        console.log('\n' + '='.repeat(60));
        console.log('✅ DRIZZLE ORM WORKING PERFECTLY!');
        console.log('='.repeat(60));

        console.log('\n📝 SUMMARY:');
        console.log('✅ Drizzle ORM berhasil konek ke mobile_database');
        console.log('✅ Kredensial yang benar:');
        console.log('   User: mobileDkydAA?&5E');
        console.log('   Password: ei8l[jmk3c{&jQr#');
        console.log('\n📋 Update .env Anda dengan:');
        console.log('DATABASE_URL="mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true"');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        const { pool } = await import('./lib/db');
        await pool.end();
    }
}

demonstrateDrizzle().catch(console.error);
