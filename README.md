# FTL Dashboard PWA

Progressive Web App Dashboard dengan sistem autentikasi menggunakan SHA256.

## Fitur

- ✅ PWA (Progressive Web App) - dapat diinstall di perangkat mobile
- ✅ Login form dengan autentikasi SHA256
- ✅ Dashboard setelah login berhasil
- ✅ Koneksi database MySQL menggunakan Prisma ORM
- ✅ Responsive design dengan Tailwind CSS

## Spesifikasi Login

- **Secret Key**: `ftl#!`
- **Algoritma**: SHA256
- **Format**: Hexadecimal (hexdigest)
- **Proses**: `SHA256('ftl#!' + password)`
- **Tabel**: `user` (kolom `password`)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Konfigurasi Database

Pastikan file `.env` di root project sudah dikonfigurasi dengan benar. Format DATABASE_URL untuk MySQL:

```env
DATABASE_URL="mysql://username:password@host:port/database_name"
```



**Catatan**: Aplikasi ini menggunakan Prisma ORM untuk koneksi database MySQL.

### 3. Verifikasi Database

**Penting**: Pastikan password di tabel `user` sudah di-hash dengan format:
- `SHA256('ftl#!' + password)` dalam format hexadecimal

Contoh untuk password `test123`:
```javascript
const crypto = require('crypto');
const password = 'test123';
const secret = 'ftl#!';
const hash = crypto.createHash('sha256').update(secret + password).digest('hex');
// Hash akan menjadi: [hexadecimal string]
```

### 4. Hash Password (jika perlu menambahkan user baru)

Gunakan script untuk hash password sebelum insert ke database:

```bash
node scripts/hash-password.js yourpassword
```

Script akan menampilkan hash yang bisa digunakan untuk insert/update password di database.

### 5. Generate Prisma Client (jika schema berubah)

```bash
npx prisma generate
```

### 6. Menjalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000)

### 7. Build untuk Production

```bash
npm run build
npm start
```

## Struktur Project

```
pwa-pt/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── login/
│   │           └── route.ts      # API endpoint untuk login
│   ├── dashboard/
│   │   └── page.tsx              # Halaman dashboard
│   ├── login/
│   │   └── page.tsx              # Halaman login
│   ├── layout.tsx                # Root layout dengan PWA config
│   └── page.tsx                  # Home page (redirect ke login/dashboard)
├── lib/
│   ├── auth.ts                   # Utility untuk hashing password
│   └── prisma.ts                 # Prisma client instance
├── prisma/
│   └── schema.prisma             # Prisma schema untuk model database
├── public/
│   └── manifest.json             # PWA manifest
└── .env.local                    # Konfigurasi database (buat sendiri)
```

## Cara Menggunakan

1. Buka aplikasi di browser
2. Anda akan diarahkan ke halaman login
3. Masukkan username dan password
4. Setelah login berhasil, Anda akan diarahkan ke dashboard
5. Untuk logout, klik tombol "Logout" di header dashboard

## PWA Installation

Aplikasi ini dapat diinstall sebagai PWA:

### Cara Install PWA:

1. **Build aplikasi terlebih dahulu:**
   ```bash
   npm run build -- --webpack
   npm start
   ```

2. **Di Desktop (Chrome/Edge):**
   - Buka aplikasi di browser
   - Klik icon install di address bar (biasanya muncul otomatis)
   - Atau buka menu (⋮) > "Install FTL Dashboard"

3. **Di Mobile (Android - Chrome):**
   - Buka aplikasi di browser
   - Menu (⋮) > "Add to Home Screen" atau "Install App"
   - Atau akan muncul popup "Add to Home Screen"

4. **Di Mobile (iOS - Safari):**
   - Buka aplikasi di Safari
   - Tap Share button (□↑)
   - Pilih "Add to Home Screen"

### Troubleshooting PWA:

- **Error saat install:** Pastikan aplikasi sudah di-build dengan `npm run build -- --webpack`
- **Service worker tidak terdaftar:** Pastikan menggunakan HTTPS atau localhost
- **Icon tidak muncul:** Pastikan file `icon-192x192.png` dan `icon-512x512.png` ada di folder `public/`
- **Manifest error:** Cek browser console untuk error detail

### Konfigurasi Face Recognition API

**Masalah:** Error "Network error: failed to fetch" saat menggunakan di device lain (tablet/mobile).

**Penyebab:** API URL hardcoded ke `127.0.0.1:8088` yang hanya bisa diakses dari device yang sama.

**Solusi:** Menggunakan Next.js API route sebagai proxy. Environment variable di-set di server-side (tidak perlu `NEXT_PUBLIC_`).

#### Langkah-langkah:

1. **Cari IP address server face recognition:**
   ```bash
   # Di server yang menjalankan face recognition API
   # Linux/Mac:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Atau:
   ip addr show | grep "inet " | grep -v 127.0.0.1
   
   # Windows:
   ipconfig
   ```
   Contoh output: `192.168.1.100` atau `10.0.0.5`

2. **Edit file `.env.local` di root project:**
   ```env
   # Gunakan FACE_API_URL (tanpa NEXT_PUBLIC_) karena ini server-side
   FACE_API_URL=http://192.168.1.100:8088/api/validate-face
   ```
   Ganti `192.168.1.100` dengan IP address server Anda.
   
   **Catatan:** Jika server face recognition berjalan di komputer yang sama dengan Next.js app, gunakan:
   ```env
   FACE_API_URL=http://127.0.0.1:8088/api/validate-face
   ```

3. **Pastikan server face recognition dapat diakses:**
   - Server harus berjalan dan listening di `0.0.0.0:8088` (bukan hanya `127.0.0.1:8088`)
   - Firewall harus mengizinkan koneksi ke port 8088
   - Test dengan curl dari server Next.js:
     ```bash
     curl -X POST http://SERVER_IP:8088/api/validate-face \
       -H "Content-Type: application/json" \
       -d '{"image_b64":"test"}'
     ```

4. **Restart development server:**
   ```bash
   npm run dev
   ```

5. **Untuk production build:**
   ```bash
   npm run build -- --webpack
   npm start
   ```

#### Keuntungan menggunakan API Proxy:

- ✅ **Tidak ada CORS issues:** Request dari client ke Next.js API route, lalu Next.js yang call face recognition API
- ✅ **Lebih aman:** API URL tidak exposed ke client-side code
- ✅ **Fleksibel:** Bisa diakses dari device manapun selama Next.js server bisa akses face recognition API
- ✅ **Environment variable server-side:** Tidak perlu `NEXT_PUBLIC_` prefix

#### Troubleshooting "Failed to fetch":

- **Cek IP address:** Pastikan IP address benar di `.env.local` dan server dapat diakses dari Next.js server
- **Cek firewall:** Pastikan port 8088 terbuka di firewall server face recognition
- **Cek network:** Pastikan Next.js server dan face recognition server dalam network yang sama
- **Cek server:** Pastikan server face recognition berjalan dan listening di `0.0.0.0:8088`
- **Cek logs:** Lihat console Next.js server untuk melihat error detail dari face recognition API

## Catatan

- Session disimpan di `sessionStorage` browser
- Pastikan password di database sudah di-hash dengan format yang benar
- Untuk production, pertimbangkan menggunakan JWT atau session management yang lebih robust
