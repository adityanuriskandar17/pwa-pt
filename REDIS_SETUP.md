# Redis Setup untuk Caching

## Deskripsi
Redis digunakan untuk caching data bookings agar perpindahan halaman atau cabang menjadi lebih cepat. Data di-cache di server-side menggunakan Redis in-memory database.

## Keuntungan Redis Caching

1. **Sangat Cepat**: In-memory storage, jauh lebih cepat dari database query
2. **Shared Cache**: Cache bisa diakses oleh semua user, tidak per-browser
3. **Auto Expire**: Cache otomatis expire setelah 5 menit (TTL)
4. **Scalable**: Bisa digunakan untuk multiple server instances

## Instalasi Redis

### Option 1: Local Redis (Development)
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server

# macOS (dengan Homebrew)
brew install redis
brew services start redis

# Windows (dengan WSL atau Docker)
docker run -d -p 6379:6379 redis:latest
```

### Option 2: Redis Cloud (Production)
- Gunakan layanan seperti Redis Cloud, Upstash, atau AWS ElastiCache
- Dapatkan connection URL dari provider

## Konfigurasi

1. **Install dependencies:**
```bash
npm install
```

2. **Set environment variable:**
Tambahkan ke file `.env.local` atau `.env`:
```env
REDIS_URL="redis://localhost:6379"
# atau untuk Redis dengan password:
REDIS_URL="redis://:password@localhost:6379"
# atau untuk Redis Cloud:
REDIS_URL="rediss://default:password@your-redis-host:6379"
```

3. **Jika Redis tidak tersedia:**
Aplikasi akan tetap berjalan tanpa Redis. Cache akan di-skip dan data langsung di-fetch dari database.

## Cara Kerja

1. **Cache Key Format:**
   - `bookings:{club_name}:{pt_name}`
   - Contoh: `bookings:FTL - Center:Testing Dery Trainer 1`

2. **Cache TTL:**
   - Default: 5 menit (300 detik)
   - Cache otomatis expire setelah TTL

3. **Cache Invalidation:**
   - Otomatis di-clear saat update face validation
   - Bisa di-force refresh dengan parameter `force_refresh=true`

4. **Fallback:**
   - Jika Redis tidak tersedia atau error, aplikasi tetap berjalan
   - Data langsung di-fetch dari database

## Testing

1. **Cek Redis connection:**
```bash
redis-cli ping
# Harus return: PONG
```

2. **Monitor cache:**
```bash
redis-cli monitor
# Akan menampilkan semua operasi Redis
```

3. **Cek cache keys:**
```bash
redis-cli keys "bookings:*"
# Menampilkan semua cache keys
```

## Troubleshooting

### Redis tidak connect
- Pastikan Redis server running: `redis-cli ping`
- Cek REDIS_URL di environment variable
- Aplikasi akan tetap berjalan tanpa Redis (fallback ke database)

### Cache tidak update
- Cache di-invalidate otomatis saat update face validation
- Bisa force refresh dengan parameter `?force_refresh=true`
- Atau tunggu TTL expire (5 menit)

### Performance masih lambat
- Pastikan Redis running dan accessible
- Cek network latency ke Redis server
- Pastikan Redis memiliki cukup memory







