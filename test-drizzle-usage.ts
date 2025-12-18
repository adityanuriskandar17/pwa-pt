import dotenv from 'dotenv';
dotenv.config();

// Update DATABASE_URL with correct credentials
process.env.DATABASE_URL = "mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true";

import { db, schema } from './lib/drizzle';
import { eq, desc, and } from 'drizzle-orm';

console.log('='.repeat(60));
console.log('🔍 TESTING DRIZZLE ORM WITH MOBILE_DATABASE');
console.log('='.repeat(60));

async function testDrizzleQueries() {
    try {
        // Test 1: Query fr_user (PT/Staff)
        console.log('\n📋 Test 1: Query fr_user (Personal Trainers)');
        console.log('='.repeat(60));

        const trainers = await db
            .select({
                id: schema.frUser.id,
                firstName: schema.frUser.firstName,
                lastName: schema.frUser.lastName,
                email: schema.frUser.email,
                ptLevel: schema.frUser.ptLevel,
                clubId: schema.frUser.clubId,
            })
            .from(schema.frUser)
            .where(eq(schema.frUser.status, 'active'))
            .limit(5);

        console.log(`✅ Found ${trainers.length} active trainers`);
        trainers.forEach((trainer, i) => {
            console.log(`  ${i + 1}. ${trainer.firstName} ${trainer.lastName} (${trainer.email}) - PT Level: ${trainer.ptLevel || 'N/A'}`);
        });

        // Test 2: Query fr_door (Clubs/Doors)
        console.log('\n📋 Test 2: Query fr_door (Clubs)');
        console.log('='.repeat(60));

        const clubs = await db
            .select({
                id: schema.frDoor.id,
                name: schema.frDoor.name,
                doorid: schema.frDoor.doorid,
                status: schema.frDoor.status,
            })
            .from(schema.frDoor)
            .where(eq(schema.frDoor.status, 'active'))
            .limit(5);

        console.log(`✅ Found ${clubs.length} active clubs`);
        clubs.forEach((club, i) => {
            console.log(`  ${i + 1}. ${club.name} (Door ID: ${club.doorid})`);
        });

        // Test 3: Query member
        console.log('\n📋 Test 3: Query member (Members)');
        console.log('='.repeat(60));

        const members = await db
            .select({
                id: schema.member.id,
                fullname: schema.member.fullname,
                email: schema.member.email,
                clubname: schema.member.clubname,
            })
            .from(schema.member)
            .limit(5);

        console.log(`✅ Found ${members.length} members`);
        members.forEach((member, i) => {
            console.log(`  ${i + 1}. ${member.fullname} (${member.email}) - Club: ${member.clubname}`);
        });

        // Test 4: Query list_booking (Bookings)
        console.log('\n📋 Test 4: Query list_booking (Recent Bookings)');
        console.log('='.repeat(60));

        const bookings = await db
            .select({
                id: schema.listBooking.id,
                day: schema.listBooking.day,
                resourceName: schema.listBooking.resourceName,
                clubName: schema.listBooking.clubName,
                type: schema.listBooking.type,
            })
            .from(schema.listBooking)
            .orderBy(desc(schema.listBooking.day))
            .limit(5);

        console.log(`✅ Found ${bookings.length} recent bookings`);
        bookings.forEach((booking, i) => {
            console.log(`  ${i + 1}. ${booking.resourceName} at ${booking.clubName} on ${booking.day} (${booking.type})`);
        });

        // Test 5: Count queries
        console.log('\n📋 Test 5: Count Statistics');
        console.log('='.repeat(60));

        const [trainerCount] = await db
            .select({ count: schema.frUser.id })
            .from(schema.frUser);

        const [clubCount] = await db
            .select({ count: schema.frDoor.id })
            .from(schema.frDoor);

        const [memberCount] = await db
            .select({ count: schema.member.id })
            .from(schema.member);

        const [bookingCount] = await db
            .select({ count: schema.listBooking.id })
            .from(schema.listBooking);

        console.log('✅ Database Statistics:');
        console.log(`  - Total Trainers/Staff: ${trainerCount.count || 0}`);
        console.log(`  - Total Clubs/Doors: ${clubCount.count || 0}`);
        console.log(`  - Total Members: ${memberCount.count || 0}`);
        console.log(`  - Total Bookings: ${bookingCount.count || 0}`);

        console.log('\n' + '='.repeat(60));
        console.log('✅ ALL DRIZZLE ORM TESTS PASSED!');
        console.log('='.repeat(60));

        console.log('\n💡 NEXT STEPS:');
        console.log('1. Update your .env with the correct DATABASE_URL:');
        console.log('   DATABASE_URL="mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true"');
        console.log('\n2. Use Drizzle ORM in your code:');
        console.log('   import { db, schema } from \'@/lib/drizzle\';');
        console.log('   const users = await db.select().from(schema.frUser);');
        console.log('\n3. Remove unused ORMs (optional):');
        console.log('   npm uninstall @prisma/client prisma sequelize');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        // Close connection pool
        const { pool } = await import('./lib/db');
        await pool.end();
    }
}

testDrizzleQueries().catch(console.error);
