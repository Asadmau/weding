# Online Wedding Invitation System

Aplikasi undangan pernikahan online fullstack untuk satu pasangan pengantin (**Single Wedding Invitation**) dengan multi-template editorial, tautan tamu personal terenkripsi, manajemen RSVP, moderasi ucapan, galeri foto, dan dashboard administrator.

## Stack Teknologi

- **Frontend**: Vue 3, TypeScript, Vite, Tailwind CSS v4, Vue Router, Pinia, Axios, Lucide Vue Next
- **Backend**: Node.js 22, Express.js, TypeScript, Zod, Helmet, Express Rate Limit, Multer, Cookie Parser
- **Database**: Embedded Relational SQLite (`node:sqlite` dengan WAL & foreign keys aktif) — arsitektur siap dipindahkan ke PostgreSQL

## Struktur Proyek

```
├── server.ts                  # Entry server Express + Vite SPA (Port 3000)
├── backend/
│   ├── src/
│   │   ├── config/            # Validasi environment (Zod)
│   │   ├── common/            # Error classes, API responses, scrypt & AES-GCM crypto
│   │   ├── db/                # SQLite client, schema 13 tabel, & idempotent seed
│   │   ├── middlewares/       # Auth session cookie, CSRF check, rate limiter, error handler
│   │   ├── storage/           # StorageProvider abstraction + local upload confinement
│   │   └── modules/           # auth, public, admin, invitations, templates, events, stories, galleries, guests, rsvp, wishes, gifts, settings, dashboard
│   └── tests/                 # Integration tests (Vitest + Supertest)
└── src/
    ├── components/wedding/    # Cover, Countdown, Lightbox, RSVP, Wishes, Gift, Music & Share
    ├── layouts/               # AdminLayout
    ├── router/                # Vue Router + Auth guards
    ├── services/              # Axios client & typed API wrappers
    ├── stores/                # Pinia auth & toast stores
    ├── templates/             # Classic Elegant, Botanical Green, Modern Minimalist + Registry
    ├── views/                 # Public InvitationView & 9 Admin Dashboard views
    └── tests/                 # Frontend unit tests
```

## API Contract (`/api/v1`)

### Authentication
- `GET /api/v1/auth/status` — Status setup awal & sesi login saat ini
- `POST /api/v1/auth/setup` — Setup satu kali akun admin pertama (otomatis terkunci setelah dibuat)
- `POST /api/v1/auth/login` — Login dengan HTTP-only session cookie
- `POST /api/v1/auth/logout` — Hapus sesi & clear cookie
- `GET /api/v1/auth/me` — Profil admin terautentikasi & token CSRF

### Public Endpoints
- `GET /api/v1/health` — Health check API
- `GET /api/v1/templates` — Daftar katalog template aktif
- `GET /api/v1/invitations/default` — Bundle undangan publik default
- `GET /api/v1/invitations/:slug` — Bundle lengkap undangan publik berdasarkan slug
- `GET /api/v1/invitations/:slug/guests/:token` — Validasi token personal tamu (SHA-256)
- `POST /api/v1/public/rsvp` — Kirim atau perbarui RSVP (personalized `guestSlug` (atau legacy `guestToken`) maupun public `editToken`)
- `POST /api/v1/public/wishes` — Kirim ucapan (default status `PENDING` untuk moderasi)

### Admin Endpoints (Membutuhkan Session Cookie + Header `X-CSRF-Token`)
- `GET /api/v1/admin/dashboard`
- `GET / PUT /api/v1/admin/invitation`
- `PUT /api/v1/admin/couple` & `POST /api/v1/admin/couple/photo/:role`
- `GET /api/v1/admin/templates` & `PUT /api/v1/admin/templates/active`
- `GET / POST / PUT / DELETE /api/v1/admin/events`
- `GET / POST / PUT / DELETE /api/v1/admin/stories`
- `GET / POST / DELETE /api/v1/admin/gallery`
- `GET / POST / PUT / DELETE /api/v1/admin/guests` & `POST /api/v1/admin/guests/:id/regenerate-token`
- `GET /api/v1/admin/rsvps` & `GET /api/v1/admin/rsvps/export` (CSV)
- `GET /api/v1/admin/wishes`, `PATCH /api/v1/admin/wishes/:id/approve`, `PATCH /api/v1/admin/wishes/:id/reject`, `DELETE /api/v1/admin/wishes/:id`
- `GET / POST / PUT / DELETE /api/v1/admin/gifts`
- `GET / PUT /api/v1/admin/settings`

## Menjalankan & Testing

```bash
npm install
npm run dev       # Menjalankan Express API + Vite frontend di port 3000
npm test          # Menjalankan integration & unit tests (Vitest + Supertest)
npm run lint      # Verifikasi TypeScript
npm run build     # Build produksi ke dist/
npm start         # Menjalankan server mode produksi
```


## Tautan Undangan Personal

Setiap tamu memiliki `guest_slug` unik yang dibentuk dari nama tamu dan akhiran acak. Contoh:

- `https://domain-undangan.com/andi-siti/boby-0123456789abcdef`
- `https://domain-undangan.com/andi-siti/ibu-kartini-putri-0123456789abcdef`

Saat aplikasi dijalankan, `initializeSchema()` menambahkan kolom `guests.guest_slug` jika database lama belum memilikinya, mengisi slug untuk tamu lama, lalu membuat unique index per undangan. Data tamu dan RSVP yang sudah ada tidak dihapus.

Link lama berbasis token (`/:slug/t/:token`) dan endpoint API token tetap didukung untuk menjaga kompatibilitas tautan yang sudah dibagikan. Link baru yang dibuat dari dashboard menggunakan format slug tamu.
