# Drizzle ORM Setup - Mobile Database

## ✅ Status: WORKING

Drizzle ORM berhasil terkoneksi ke **mobile_database** di Google Cloud SQL.

---

## 🔧 Konfigurasi

### 1. Update `.env`

Ganti `DATABASE_URL` di file `.env` dengan kredensial yang benar:

```env
DATABASE_URL="mysql://mobileDkydAA%3F%265E:ei8l%5Bjmk3c%7B%26jQr%23@127.0.0.1:3308/mobile_database?useSSL=false&allowPublicKeyRetrieval=true"
```

**Kredensial (decoded)**:
- Username: `mobileDkydAA?&5E`
- Password: `ei8l[jmk3c{&jQr#`
- Host: `127.0.0.1` (Cloud SQL Proxy)
- Port: `3308`
- Database: `mobile_database`

---

## 📁 File Structure

```
lib/
  ├── db.ts          # mysql2 connection pool
  └── drizzle.ts     # Drizzle ORM instance

drizzle/
  └── schema.ts      # Database schema definitions

drizzle.config.ts    # Drizzle Kit configuration
```

---

## 🚀 Cara Penggunaan

### Import Drizzle

```typescript
import { db, schema } from '@/lib/drizzle';
import { eq, desc, and, or } from 'drizzle-orm';
```

### Query Examples

#### 1. Select All
```typescript
// Get all active trainers
const trainers = await db
  .select()
  .from(schema.frUser)
  .where(eq(schema.frUser.status, 'active'));
```

#### 2. Select Specific Columns
```typescript
// Get trainer names and emails
const trainers = await db
  .select({
    id: schema.frUser.id,
    name: schema.frUser.firstName,
    email: schema.frUser.email,
  })
  .from(schema.frUser)
  .limit(10);
```

#### 3. Where Conditions
```typescript
// Get trainer by email
const trainer = await db
  .select()
  .from(schema.frUser)
  .where(eq(schema.frUser.email, 'example@gmail.com'))
  .limit(1);
```

#### 4. Multiple Conditions
```typescript
// Get active trainers from specific club
const trainers = await db
  .select()
  .from(schema.frUser)
  .where(
    and(
      eq(schema.frUser.status, 'active'),
      eq(schema.frUser.clubId, 1)
    )
  );
```

#### 5. Order By
```typescript
// Get recent bookings
const bookings = await db
  .select()
  .from(schema.listBooking)
  .orderBy(desc(schema.listBooking.day))
  .limit(10);
```

#### 6. Insert
```typescript
// Insert new trainer
await db.insert(schema.frUser).values({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'active',
  // ... other fields
});
```

#### 7. Update
```typescript
// Update trainer
await db
  .update(schema.frUser)
  .set({ status: 'inactive' })
  .where(eq(schema.frUser.id, 123));
```

#### 8. Delete
```typescript
// Delete trainer
await db
  .delete(schema.frUser)
  .where(eq(schema.frUser.id, 123));
```

---

## 📊 Available Tables (Schema)

| Table Name | Schema Export | Description |
|------------|---------------|-------------|
| `fr_user` | `schema.frUser` | Personal trainers & staff |
| `fr_door` | `schema.frDoor` | Clubs/Doors |
| `member` | `schema.member` | Gym members |
| `list_booking` | `schema.listBooking` | PT bookings |
| `webhook_checkin` | `schema.webhookCheckin` | Check-in logs |

---

## 🔍 Troubleshooting

### Error: "DATABASE_URL environment variable must be set"

**Solusi**: Pastikan file `.env` ada dan berisi `DATABASE_URL` yang benar.

### Error: "Access denied for user"

**Solusi**: 
1. Pastikan Cloud SQL Proxy berjalan di port 3308
2. Cek kredensial di `.env` sudah benar (URL-encoded)
3. Pastikan user memiliki permission di Cloud SQL

### Error: "Can't connect to MySQL server"

**Solusi**:
1. Pastikan Cloud SQL Proxy berjalan: `ps aux | grep cloud-sql-proxy`
2. Restart Cloud SQL Proxy jika perlu
3. Cek koneksi: `telnet 127.0.0.1 3308`

---

## 🧹 Cleanup (Optional)

Jika Anda hanya menggunakan Drizzle ORM, Anda bisa uninstall ORM lain:

```bash
npm uninstall @prisma/client prisma sequelize
```

Dan hapus file yang tidak digunakan:
```bash
rm -rf prisma/
```

---

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle MySQL Guide](https://orm.drizzle.team/docs/get-started-mysql)
- [Drizzle Queries](https://orm.drizzle.team/docs/crud)

---

## ✅ Verified Working

- ✅ Connection to mobile_database
- ✅ SELECT queries
- ✅ WHERE conditions
- ✅ ORDER BY
- ✅ LIMIT
- ✅ Multiple table queries

**Last tested**: 2025-12-18
