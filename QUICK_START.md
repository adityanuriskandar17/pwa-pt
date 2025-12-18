# 🚀 Quick Start - Fix Database Connection

## Step 1: Update `.env` File

Buka file `.env` di root project Anda dan **ganti** baris `DATABASE_URL` dengan:

```env
DATABASE_URL="mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true"
```

**PENTING**: Pastikan tidak ada spasi sebelum atau sesudah tanda `=`

---

## Step 2: Restart Development Server

Jika dev server sedang berjalan, restart:

```bash
# Stop server (Ctrl+C)
# Then start again
npm run dev
```

---

## Step 3: Test Connection (Optional)

Jalankan test untuk memastikan koneksi berhasil:

```bash
npx tsx demo-drizzle.ts
```

Jika berhasil, Anda akan melihat:
```
✅ DRIZZLE ORM WORKING PERFECTLY!
```

---

## Step 4: Gunakan Drizzle ORM di Code Anda

### Import
```typescript
import { db, schema } from '@/lib/drizzle';
import { eq } from 'drizzle-orm';
```

### Contoh Query
```typescript
// Get trainers
const trainers = await db
  .select()
  .from(schema.frUser)
  .where(eq(schema.frUser.status, 'active'));

// Get members
const members = await db
  .select()
  .from(schema.member)
  .limit(10);
```

---

## Step 5: Clean Up (Optional)

Hapus file test yang tidak diperlukan:

```bash
rm test-*.ts demo-*.ts decode-*.ts
```

---

## ✅ Done!

Database Anda sekarang sudah terkoneksi dengan benar menggunakan **Drizzle ORM**.

**Dokumentasi lengkap**: Lihat `DRIZZLE_SETUP.md`  
**Contoh API**: Lihat folder `examples/`

---

## ❓ Troubleshooting

### Masih error "DATABASE_URL must be set"?
- Pastikan file `.env` ada di root project
- Pastikan tidak ada typo di DATABASE_URL
- Restart terminal/IDE Anda

### Error "Access denied"?
- Pastikan Cloud SQL Proxy berjalan di port 3308
- Cek dengan: `ps aux | grep cloud-sql-proxy`

### Butuh bantuan?
Lihat file `DATABASE_FIX_SUMMARY.md` untuk penjelasan lengkap.
