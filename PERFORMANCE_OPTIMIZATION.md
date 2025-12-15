# Performance Optimization Guide

## ✅ Checklist Optimasi yang Sudah Diterapkan

### 1. Connection Pool (WAJIB) ✅
- **File**: `lib/db.ts`
- **Status**: Sudah menggunakan `mysql.createPool` dengan konfigurasi optimal
- **Settings**:
  - `connectionLimit: 20` - Meningkatkan limit untuk concurrent requests
  - `waitForConnections: true` - Tunggu jika semua connection sedang dipakai
  - `queueLimit: 0` - Unlimited queue
  - `enableKeepAlive: true` - Reuse connections
  - `acquireTimeout: 60000` - 60 detik timeout

### 2. Redis Caching (BEST) ✅
- **File**: `lib/redis.ts`, `app/api/bookings/route.ts`, `app/api/clubs/route.ts`
- **Status**: Sudah diimplementasikan dengan TTL
- **Cache Keys**:
  - `bookings:{club_name}:{pt_name}` - TTL 5 menit
  - `clubs:list` - TTL 10 menit
- **Auto Invalidation**: Cache di-clear otomatis saat update face validation

### 3. Query Optimization ✅
- **Status**: Semua query sudah dioptimasi
- **Improvements**:
  - ❌ Tidak ada `SELECT *` - Semua query sudah spesifik
  - ✅ Semua query menggunakan `LIMIT 100`
  - ✅ Query sudah menggunakan kolom spesifik, bukan `lw1.*`
  - ✅ Ada WHERE filter untuk mengurangi data yang di-scan

### 4. Next.js Fetch Cache ✅
- **File**: `app/dashboard/page.tsx`
- **Status**: Sudah ditambahkan `next: { revalidate: 60 }`
- **Fallback**: Jika Redis tidak ada, Next.js cache akan digunakan

### 5. API Route Pattern ✅
- **Status**: Semua query melalui API route, tidak langsung di page component
- **Pattern**: `page.tsx → fetch("/api/...") → API → MySQL`

## 📋 Index MySQL yang WAJIB Dibuat

Jalankan migration script untuk membuat index:

```bash
# Masuk ke MySQL
mysql -u your_user -p your_database < drizzle/migrations/add_performance_indexes.sql
```

Atau jalankan manual:

```sql
-- Index untuk log_webhook
CREATE INDEX idx_log_webhook_bookingid_timestamp ON log_webhook(bookingid, timestamp DESC);
CREATE INDEX idx_log_webhook_bookingid_id ON log_webhook(bookingid, id DESC);

-- Index untuk list_booking
CREATE INDEX idx_list_booking_club_name ON list_booking(club_name);
CREATE INDEX idx_list_booking_resource_name ON list_booking(resource_name);
CREATE INDEX idx_list_booking_id ON list_booking(id);
CREATE INDEX idx_list_booking_club_resource ON list_booking(club_name, resource_name);

-- Index untuk member
CREATE INDEX idx_member_member_id ON member(member_id);

-- Index untuk user (login)
CREATE INDEX idx_user_email ON user(email);
```

### Verifikasi Index

```sql
-- Cek index yang sudah dibuat
SHOW INDEX FROM log_webhook;
SHOW INDEX FROM list_booking;
SHOW INDEX FROM member;
SHOW INDEX FROM user;
```

### Test Query Performance

```sql
-- Test query dengan EXPLAIN
EXPLAIN SELECT 
  lw.id, lw.bookingid, lw.timestamp
FROM log_webhook lw
WHERE lw.bookingid = 12345
ORDER BY lw.timestamp DESC
LIMIT 100;

-- Pastikan type = 'ref' atau 'range', BUKAN 'ALL' (full table scan)
```

## 🚀 Performance Monitoring

### 1. Redis Cache Hit Rate
Monitor di console log:
- `Using Redis cache for: bookings:...` = Cache hit (sangat cepat)
- Tidak ada log = Cache miss (query ke database)

### 2. Database Query Time
Monitor di MySQL slow query log:
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1; -- Log queries > 1 detik
```

### 3. Connection Pool Status
Monitor connection pool usage:
```typescript
// Tambahkan di lib/db.ts untuk monitoring (optional)
connection.on('connection', (connection) => {
  console.log('New connection:', connection.threadId);
});
```

## 📊 Expected Performance

### Before Optimization
- First load: ~2-3 detik
- Switch club: ~2-3 detik
- Switch page: ~2-3 detik

### After Optimization (dengan Redis + Index)
- First load: ~1-2 detik (query database)
- Switch club (cache hit): ~50-200ms (dari Redis)
- Switch page (cache hit): ~50-200ms (dari Redis)
- Switch club (cache miss): ~1-2 detik (query database, lalu cache)

## 🔧 Troubleshooting

### Masalah: Masih lambat setelah optimasi

1. **Cek Redis connection**:
   ```bash
   redis-cli ping
   # Harus return: PONG
   ```

2. **Cek Index sudah dibuat**:
   ```sql
   SHOW INDEX FROM log_webhook;
   ```

3. **Cek query menggunakan index**:
   ```sql
   EXPLAIN SELECT ... FROM log_webhook WHERE bookingid = ...;
   -- Pastikan type = 'ref', bukan 'ALL'
   ```

4. **Cek connection pool**:
   - Pastikan `connectionLimit` cukup besar
   - Monitor connection pool usage

### Masalah: Cache tidak bekerja

1. **Cek REDIS_URL**:
   ```bash
   echo $REDIS_URL
   ```

2. **Test Redis connection**:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

3. **Cek cache keys**:
   ```bash
   redis-cli keys "bookings:*"
   ```

## 📝 Best Practices

1. ✅ **Selalu gunakan connection pool** - Jangan create connection baru per request
2. ✅ **Selalu cache query yang sering dipanggil** - Gunakan Redis
3. ✅ **Selalu gunakan LIMIT** - Jangan fetch semua data
4. ✅ **Selalu spesifik kolom** - Jangan SELECT *
5. ✅ **Selalu buat index** - Untuk WHERE, JOIN, ORDER BY
6. ✅ **Monitor slow queries** - Optimasi query yang lambat
7. ✅ **Gunakan pagination** - Untuk data besar
8. ✅ **Gunakan Suspense** - Untuk UX yang lebih baik

## 🎯 Next Steps (Optional)

1. **Add query monitoring** - Track slow queries
2. **Add connection pool monitoring** - Track pool usage
3. **Add cache metrics** - Track cache hit rate
4. **Add pagination** - Jika data > 100 records
5. **Add keyset pagination** - Untuk performa lebih baik


