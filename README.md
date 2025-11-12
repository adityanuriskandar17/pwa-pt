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

1. Buka aplikasi di browser mobile (Chrome/Safari)
2. Pilih "Add to Home Screen" atau "Install App"
3. Aplikasi akan tersedia seperti aplikasi native

## Catatan

- Session disimpan di `sessionStorage` browser
- Pastikan password di database sudah di-hash dengan format yang benar
- Untuk production, pertimbangkan menggunakan JWT atau session management yang lebih robust
