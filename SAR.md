# SAR — System Architecture & Security Requirements

Dokumen ini gabungan arsitektur sistem + requirement keamanan. **Baca sebelum bikin auth, admin panel, atau game engine.** Ini bukan checklist opsional — proyek-proyek Bayu sebelumnya (M2A Co-Biz, Etalase Affiliate) kena masalah keamanan yang bisa dicegah kalau ini dipikirkan dari awal (hardcoded fallback password, session secret gak konsisten, debug route yang bocorin TOTP secret, endpoint publik yang harusnya private). Jangan ulangi.

## 1. Arsitektur Sistem (Ringkas)

```
┌─────────────┐     Google OAuth      ┌──────────────┐
│   Browser    │ ────────────────────▶ │  NextAuth v5  │
│  (Next.js)   │ ◀──────────────────── │   (Google)    │
└──────┬───────┘                       └──────────────┘
       │
       │  Server Actions / Route Handlers (App Router)
       ▼
┌─────────────────────────────────────────────────────┐
│  Next.js Server (Vercel)                             │
│  - Semua logika game (dice, movement, ability) DI SINI│
│  - Admin role check di setiap handler, bukan cuma     │
│    middleware                                         │
└───────┬───────────────────────┬──────────────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌────────────────┐
│ Neon Postgres  │       │  Pusher Channels│
│ (via Prisma)   │       │  (broadcast     │
│                │       │   turn events)  │
└────────────────┘       └────────────────┘
        │
        ▼
┌────────────────┐
│  Vercel Blob    │
│  (avatar, aset  │
│   tema)         │
└────────────────┘
```

**Kenapa Pusher, bukan raw WebSocket server:** Vercel serverless functions tidak persistent-connection-friendly. Pusher Channels (free tier cukup untuk MVP) kasih presence channel + broadcast tanpa perlu maintain server terpisah. Karena gameplay turn-based (bukan realtime kontinu seperti FPS), latensi Pusher (~100-300ms) tidak masalah.

**Kenapa realtime tetap dibutuhkan padahal turn-based:** biar pemain lain lihat giliran, hasil dadu, dan pergerakan lawan secara live tanpa refresh manual — pengalaman terasa "hidup", bukan polling kasar.

## 2. Prinsip Arsitektur Non-Negotiable

1. **Server adalah sumber kebenaran tunggal untuk state game.** Client tidak pernah mengirim "saya dapat dadu 5" — client hanya mengirim "saya roll dadu", server yang menghitung hasil, memvalidasi giliran, dan broadcast hasilnya. Ini mencegah cheat.
2. **Admin route diverifikasi di dua lapis:** middleware (biar cepat redirect) DAN di dalam setiap Server Action/Route Handler itu sendiri (biar gak ada yang kebobolan kalau ada jalur akses yang lupa di-cover middleware — ini persis pola bug lama: "debug API route leaking TOTP secrets").
3. **Tidak ada rahasia hardcoded, tidak ada fallback password.** `NEXTAUTH_SECRET`, kredensial Google OAuth, Pusher keys, Blob token — semua dari environment variable, konsisten di semua environment (dev/preview/production), tidak ada default value yang "aman kalau lupa di-set".
4. **Tidak ada endpoint admin/debug yang publicly reachable**, termasuk untuk keperluan development — hapus sebelum deploy, atau gate di balik `NODE_ENV !== 'production'` DAN role check.

## 3. Skema Database (Prisma — draf awal)

```prisma
// schema.prisma — draf, OpenCode boleh sesuaikan detail tipe/index
// tapi JANGAN hilangkan constraint keamanan yang sudah ditandai.

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  nickname      String?  // ganti nickname, terpisah dari nama Google
  image         String?  // foto dari Google (fallback)
  avatarUrl     String?  // foto custom upload (Vercel Blob), override `image` kalau ada
  role          Role     @default(PLAYER)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  accounts      Account[]
  sessions      Session[]
  roomPlayers   RoomPlayer[]
  adminActions  AdminAuditLog[] @relation("ActorAdminActions")
}

enum Role {
  PLAYER
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

// Account & Session: model standar NextAuth v5 Prisma adapter — jangan diubah strukturnya

model Character {
  id           String  @id // slug, mis. "dawn", "wren"
  name         String
  archetype    String
  abilityName  String
  abilityDesc  String
  role         String  // "Defense" | "Luck" | "Offense" | dst — lihat PRD §11
  spriteBaseUrl String // path aset spritesheet dasar
  isEnabled    Boolean @default(true) // admin bisa disable

  roomPlayers  RoomPlayer[]
}

model Theme {
  id           String  @id // slug, mis. "wanderers-path"
  name         String
  description  String
  boardArtUrl  String
  isEnabled    Boolean @default(true)
  isDefault    Boolean @default(false)

  rooms        Room[]
}

model Room {
  id           String   @id @default(cuid())
  code         String   @unique // 6 karakter, generate server-side
  themeId      String
  theme        Theme    @relation(fields: [themeId], references: [id])
  hostUserId   String
  status       RoomStatus @default(LOBBY)
  createdAt    DateTime @default(now())
  startedAt    DateTime?
  endedAt      DateTime?
  currentTurnIndex Int  @default(0)

  players      RoomPlayer[]
  moves        GameMove[]
}

enum RoomStatus {
  LOBBY
  IN_PROGRESS
  FINISHED
  ABANDONED
}

model RoomPlayer {
  id           String   @id @default(cuid())
  roomId       String
  room         Room     @relation(fields: [roomId], references: [id])
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  characterId  String
  character    Character @relation(fields: [characterId], references: [id])
  cosmeticVariant String @default("default") // palette-swap id
  turnOrder    Int
  position     Int      @default(0) // tile 0-100
  isReady      Boolean  @default(false)
  heldCards    Json     @default("[]") // array Action Card id yang dipegang
  usedAbility  Boolean  @default(false) // untuk ability 1x/match
  isWinner     Boolean  @default(false)
  joinedAt     DateTime @default(now())

  @@unique([roomId, characterId]) // no duplikat karakter per room
  @@unique([roomId, userId])
}

// Log tiap giliran — untuk anti-cheat audit & replay/riwayat pertandingan
model GameMove {
  id          String   @id @default(cuid())
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id])
  roomPlayerId String
  diceResult  Int      // dihasilkan SERVER, bukan dari client
  fromTile    Int
  toTile      Int
  effectType  String?  // "hazard" | "boost" | "event" | "powerup" | "ability" | null
  effectDetail Json?
  createdAt   DateTime @default(now())
}

model AdminAuditLog {
  id          String   @id @default(cuid())
  actorId     String
  actor       User     @relation("ActorAdminActions", fields: [actorId], references: [id])
  action      String   // "SUSPEND_USER" | "END_ROOM" | "TOGGLE_CHARACTER" | dst
  targetType  String
  targetId    String
  detail      Json?
  createdAt   DateTime @default(now())
}
```

## 4. Requirement Keamanan (Wajib, Prioritas Tinggi → Rendah)

### CRITICAL

1. **Server-authoritative RNG.** `Math.random()` untuk dadu HANYA dipanggil di server (Server Action/Route Handler), hasil langsung ditulis ke `GameMove`, lalu di-broadcast. Client tidak pernah bisa submit hasil dadu sendiri.
2. **Validasi giliran di server.** Setiap aksi (roll dadu, pakai ability, pakai card) harus dicek: apakah `userId` ini memang giliran dia sekarang di room ini? Tolak kalau bukan.
3. **Proteksi route admin dua lapis** (lihat § 2 poin 2). Contoh pola yang benar:
   ```ts
   // app/admin/_lib/require-admin.ts
   export async function requireAdmin() {
     const session = await auth();
     if (!session?.user || session.user.role !== "ADMIN") {
       throw new Error("Forbidden");
     }
     return session.user;
   }
   // Panggil requireAdmin() di AWAL setiap Server Action & Route Handler admin,
   // JANGAN cuma andalkan middleware.ts
   ```
4. **`NEXTAUTH_SECRET` dan semua kredensial dari env var**, tidak ada fallback hardcoded. Sama persis untuk `PUSHER_SECRET`, `BLOB_READ_WRITE_TOKEN`.
5. **Tidak ada link/nav ke `/admin` di UI publik.** Akses murni via role check, bukan security-by-obscurity semata — tapi tetap jangan expose link-nya.

### HIGH

6. **Rate limit** endpoint sensitif: roll dadu, join room, upload avatar, ganti nickname (cegah spam/abuse).
7. **Validasi upload avatar di server**, bukan cuma client: cek MIME type (`image/jpeg`, `image/png`, `image/webp` saja), cek ukuran max (2MB setelah kompresi klien), sanitize nama file, jangan percaya `Content-Type` header mentah-mentah.
8. **Room code cukup random** (6 karakter dari alfabet 32 simbol non-ambigu = ~1 miliar kombinasi) dan **room tidak aktif > 2 jam otomatis di-mark `ABANDONED`** (cron/cleanup job atau lazy check saat diakses).
9. **CSRF protection** pada semua mutating Server Action admin — Next.js Server Actions punya proteksi built-in selama dipanggil sebagai Server Action asli (bukan di-expose sebagai public API tanpa origin check).

### MEDIUM

10. **Audit log setiap aksi admin** ke `AdminAuditLog` — siapa, aksi apa, kapan, target apa.
11. **Suspended user** (`status: SUSPENDED`) ditolak di `signIn` callback NextAuth, bukan cuma disembunyikan di UI.
12. **Environment variable checklist** didokumentasikan di `.env.example`, tidak ada nilai sensitif ter-commit ke git.

## 5. Performance Requirements (dari vercel-react-best-practices)

- Autentikasi Server Action seperti autentikasi Route Handler — jangan asumsikan Server Action otomatis aman tanpa cek session.
- Gunakan `React.cache()` untuk dedup fetch data user/room dalam 1 request.
- Fetch data independen (misal: data room + data karakter) di-`Promise.all()`, jangan waterfall.
- Halaman yang pakai `useSearchParams` (misal filter room/admin) WAJIB dibungkus `<Suspense>` — ini guardrail lama yang sudah kejadian 8x gagal deploy di M2A Co-Biz, jangan ulangi.
- Komponen berat (character customizer, board renderer) pakai `next/dynamic` biar tidak membengkakkan bundle awal.
- Animasi token: animate `transform` (x/y/scale), **bukan** `top`/`left`/`width`/`height` — mencegah layout thrashing, terutama penting karena token bergerak lintas banyak tile berurutan.

## 6. Pre-Launch Security Checklist

- [ ] Tidak ada `console.log` yang membocorkan session/token di production
- [ ] Semua Server Action admin punya `requireAdmin()` di baris pertama
- [ ] Dice roll 100% dihitung server, diverifikasi dengan test unit
- [ ] Upload avatar divalidasi ulang di server (bukan percaya validasi client)
- [ ] `NEXTAUTH_SECRET` unik per environment, tidak pernah sama dengan contoh di dokumentasi
- [ ] Tidak ada route `/api/debug/*` atau sejenisnya ikut ter-deploy ke production
- [ ] Rate limiting aktif di endpoint roll dadu & upload
- [ ] Suspended user benar-benar tidak bisa login, bukan cuma UI-nya disembunyikan
- [ ] `npx next build` sukses tanpa warning terkait `useSearchParams`/Suspense
