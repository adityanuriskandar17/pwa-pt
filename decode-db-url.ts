import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('='.repeat(60));
console.log('🔍 DATABASE URL DECODER');
console.log('='.repeat(60));

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
}

console.log('\n📋 Original DATABASE_URL:');
console.log(databaseUrl);

// Parse URL
const cleanUrl = databaseUrl.split('?')[0];
const queryString = databaseUrl.includes('?') ? databaseUrl.split('?')[1] : '';

console.log('\n📋 Clean URL (without query params):');
console.log(cleanUrl);

console.log('\n📋 Query parameters:');
console.log(queryString);

const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
const match = cleanUrl.match(regex);

if (!match) {
    console.error('❌ Failed to parse DATABASE_URL');
    process.exit(1);
}

const [, userEncoded, passwordEncoded, host, port, database] = match;

console.log('\n📋 Encoded credentials:');
console.log('User (encoded):', userEncoded);
console.log('Password (encoded):', passwordEncoded);

console.log('\n📋 Decoded credentials:');
const userDecoded = decodeURIComponent(userEncoded);
const passwordDecoded = decodeURIComponent(passwordEncoded);

console.log('User (decoded):', userDecoded);
console.log('Password (decoded):', passwordDecoded);
console.log('Host:', host);
console.log('Port:', port);
console.log('Database:', database);

console.log('\n📋 Character analysis:');
console.log('Username characters:');
for (let i = 0; i < userDecoded.length; i++) {
    const char = userDecoded[i];
    const code = char.charCodeAt(0);
    console.log(`  [${i}] '${char}' (ASCII ${code})`);
}

console.log('\nPassword characters:');
for (let i = 0; i < passwordDecoded.length; i++) {
    const char = passwordDecoded[i];
    const code = char.charCodeAt(0);
    console.log(`  [${i}] '${char}' (ASCII ${code})`);
}

console.log('\n📋 Suggested fixes:');
console.log('\nIf your ACTUAL credentials are:');
console.log('Username: mobileDkydAA2&5E');
console.log('Password: ei81j[mK3c@{jQr#');
console.log('\nThen your DATABASE_URL should be:');

const userProperlyEncoded = encodeURIComponent('mobileDkydAA2&5E');
const passwordProperlyEncoded = encodeURIComponent('ei81j[mK3c@{jQr#');

const correctUrl = `mysql://${userProperlyEncoded}:${passwordProperlyEncoded}@${host}:${port}/${database}?useSSL=false&allowPublicKeyRetrieval=true`;

console.log(correctUrl);

console.log('\n' + '='.repeat(60));
