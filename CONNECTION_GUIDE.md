# Panduan Koneksi ke Google Cloud SQL

Proyek ini sudah dikonfigurasi untuk terhubung ke Google Cloud SQL. File `.env.local` telah dibuat dengan konfigurasi koneksi.

## Informasi Koneksi

- **Instance ID**: `dbconsolidation1`
- **Connection Name**: `webserver-435507:asia-southeast2:dbconsolidation1`
- **Database**: `mobile_database`
- **Public IP**: `34.50.80.236`
- **Port**: `3306` (default MySQL)

## Metode Koneksi

### 1. Direct Connection via Public IP (Saat Ini)

File `.env.local` sudah dikonfigurasi untuk koneksi langsung via Public IP. 

**Catatan Penting:**
- Pastikan IP address server Anda sudah ditambahkan ke **Authorized Networks** di Google Cloud SQL
- Untuk menambahkan IP ke Authorized Networks:
  1. Buka Google Cloud Console
  2. Pilih instance `dbconsolidation1`
  3. Buka tab "Connections"
  4. Klik "Add Network"
  5. Masukkan IP address server Anda

### 2. Cloud SQL Proxy (Recommended untuk Production)

Cloud SQL Proxy lebih aman dan tidak memerlukan IP whitelist.

**Langkah-langkah:**

1. **Install Cloud SQL Proxy:**
   ```bash
   # Download untuk Linux
   wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud-sql-proxy
   chmod +x cloud-sql-proxy
   ```

2. **Authenticate (jika belum):**
   ```bash
   gcloud auth application-default login
   ```

3. **Jalankan Cloud SQL Proxy:**
   ```bash
   ./cloud-sql-proxy webserver-435507:asia-southeast2:dbconsolidation1
   ```
   
   Proxy akan listen di `127.0.0.1:3306`

4. **Update `.env.local`:**
   ```env
   DATABASE_URL="mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3306/mobile_database"
   ```

## Testing Koneksi

### Test dengan Prisma Studio

```bash
npx prisma studio
```

Ini akan membuka Prisma Studio di browser untuk melihat data database.

### Test dengan Prisma CLI

```bash
# Generate Prisma Client
npx prisma generate

# Test koneksi dengan introspect (jika perlu)
npx prisma db pull
```

### Test dengan Node.js Script

Buat file `test-connection.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Koneksi berhasil!');
    
    // Test query sederhana
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error koneksi:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Jalankan:
```bash
node test-connection.js
```

## Troubleshooting

### Error: "Access denied for user"
- Pastikan username dan password benar
- Pastikan user memiliki akses ke database `mobile_database`

### Error: "Can't connect to MySQL server"
- **Jika menggunakan Public IP:**
  - Pastikan IP server Anda ada di Authorized Networks
  - Pastikan firewall mengizinkan koneksi ke port 3306
  - Cek apakah instance Cloud SQL sudah running

- **Jika menggunakan Cloud SQL Proxy:**
  - Pastikan proxy sudah berjalan
  - Pastikan proxy listening di port 3306
  - Cek authentication dengan `gcloud auth application-default login`

### Error: "Unknown database 'mobile_database'"
- Pastikan database `mobile_database` sudah dibuat di Cloud SQL instance
- Atau ganti nama database di `DATABASE_URL` sesuai database yang ada

### Special Characters dalam Password/Username
Password dan username sudah di-URL-encode di `.env.local`. Jika Anda mengubah password/username, pastikan untuk URL-encode karakter khusus:
- `?` → `%3F`
- `&` → `%26`
- `[` → `%5B`
- `{` → `%7B`
- `#` → `%23`

## Keamanan

⚠️ **PENTING**: File `.env.local` berisi kredensial sensitif. Jangan commit file ini ke Git!

Pastikan `.env.local` ada di `.gitignore`:
```bash
echo ".env.local" >> .gitignore
```

## Next Steps

Setelah koneksi berhasil:

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Jalankan aplikasi:**
   ```bash
   npm run dev
   ```

3. **Test koneksi di aplikasi:**
   - Buka http://localhost:3000
   - Coba login untuk test koneksi database
