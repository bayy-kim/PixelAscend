# OpenCode Build Prompt — PixelAscend

> Cara pakai: jalankan dari root repo yang sudah berisi `PRD.md`, `SAR.md`, `AGENTS.md`, `DESIGN.md`, `prompt_khusus_update_tema.md` di root project.
> ```bash
> opencode run "$(cat OPENCODE_BUILD_PROMPT.md)" -f PRD.md -f SAR.md -f AGENTS.md -f DESIGN.md
> ```
> Untuk fase yang besar (Fase 6–8), lebih aman jalankan satu fase per sesi `opencode run` daripada semua sekaligus, biar gampang di-review incremental dari HP.

---

## Peran Kamu

Kamu membangun **PixelAscend** — ular tangga multiplayer chibi pixel-art fantasy. Sebelum menulis satu baris kode pun:

1. Baca `PRD.md` (fitur & scope), `SAR.md` (arsitektur & keamanan), `AGENTS.md` (guardrail teknis), `DESIGN.md` (token desain).
2. Kerjakan fase secara berurutan (Fase 0 → 10). Jangan lompat ke gameplay sebelum fondasi auth & database jalan.
3. Setiap fase punya "Kriteria Selesai" — cek semua sebelum lanjut ke fase berikutnya.
4. Kalau ada konflik antara instruksi di prompt ini dan `AGENTS.md`/`SAR.md`, **`AGENTS.md`/`SAR.md` yang menang** — dokumen itu berisi guardrail keamanan/kualitas yang tidak boleh dilonggarkan.

Non-negotiable yang paling sering dilanggar (ulang di sini karena penting): dice roll & resolusi gerakan **selalu di server**, setiap route admin **cek ulang role di dalam handler-nya sendiri**, sprite **wajib `image-rendering: pixelated`**, tidak ada hardcoded secret.

---

## Fase 0 — Setup Fondasi

- Init Next.js 15 (App Router, TypeScript, Tailwind v4) via `create-next-app@latest --yes`
- Setup Prisma + koneksi Neon (`DATABASE_URL` dari env), terapkan schema dari `SAR.md` § 3
- Setup NextAuth v5, provider Google saja, `trustHost: true`, adapter Prisma
- Setup `app/globals.css` dengan `@theme` sesuai token `DESIGN.md` (warna, font, radius, spacing)
- Load font: `Press Start 2P` (Google Fonts, untuk display/heading) + `Geist Sans` (body) via `next/font/google`
- Buat `.env.example` berisi semua key yang dibutuhkan: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `BLOB_READ_WRITE_TOKEN`
- Seed data awal: 8 karakter (Fase 6) dan 1 tema default "Wanderer's Path"

**Kriteria selesai:** `npm run dev` jalan, `npx prisma migrate dev` sukses, Google login berhasil redirect balik ke app (boleh masih ke halaman kosong).

---

## Fase 1 — Landing Page & Auth

**Route:** `app/(marketing)/page.tsx`

- Hero section: judul pakai typography `display`, tagline singkat, preview 2-3 sprite karakter (statis dulu, animasi belakangan)
- 3 highlight fitur singkat (multiplayer real-time, karakter dengan kemampuan unik, animasi hidup)
- Satu CTA: **"Sign in with Google"** — trigger `signIn("google")`, redirect ke `/dashboard` setelah sukses
- Tidak ada elemen lain yang mengarah ke fitur dalam aplikasi (semua digembok di balik login)

**Kriteria selesai:** Guest yang belum login hanya bisa lihat halaman ini. Redirect otomatis ke `/dashboard` kalau user yang sudah login membuka `/`.

---

## Fase 2 — Dashboard User

**Route:** `app/dashboard/page.tsx`, Server Action di `app/dashboard/_actions/`

- Card profil: avatar (custom kalau ada, fallback foto Google), nickname, tombol "Main Sekarang" (ke Fase 4)
- Card statistik: total game, total menang, win rate (%) — hitung dari `RoomPlayer.isWinner` join `Room.status = FINISHED`
- Form ganti nickname: validasi 3–20 karakter, server action, optimistic update
- Upload foto profil: input file → kompres/resize klien ke max 512×512 (canvas API) → upload ke Vercel Blob via server action → validasi ulang MIME+ukuran di server (lihat `SAR.md` § 4 poin 7) → update `User.avatarUrl`
- List 5 pertandingan terakhir (opsional tapi kerjakan kalau waktu cukup): karakter dipakai, menang/kalah, tanggal

**Kriteria selesai:** Statistik akurat setelah 1 game selesai (test manual). Upload avatar gagal dengan pesan jelas kalau file bukan gambar atau >2MB.

---

## Fase 3 — Admin Panel

**Route:** `app/admin/*`, dilindungi `middleware.ts` **dan** `requireAdmin()` di setiap handler (lihat `SAR.md` § 4 poin 3 untuk contoh kode)

- `app/admin/page.tsx` — ringkasan: total user, room aktif, game selesai hari ini
- `app/admin/users/page.tsx` — cari & lihat user, tombol suspend/unsuspend
- `app/admin/rooms/page.tsx` — daftar room aktif/selesai, tombol force-end
- `app/admin/catalog/page.tsx` — toggle enable/disable per karakter & per tema
- `app/admin/audit-log/page.tsx` — daftar `AdminAuditLog`, terbaru di atas
- **Tidak ada link ke `/admin` di navigasi manapun yang terlihat user biasa.** Role `ADMIN` di-set manual lewat database (`npx prisma studio` atau seed script), bukan lewat UI signup.
- Setiap aksi mutasi di atas WAJIB menulis entry ke `AdminAuditLog`

**Kriteria selesai:** User dengan role `PLAYER` yang mengakses `/admin/*` langsung (paste URL manual) mendapat redirect/403, bukan flash-of-content sebelum redirect. Coba juga akses langsung ke Server Action admin dari luar (simulasikan) — harus ditolak `requireAdmin()`.

---

## Fase 4 — Pemilihan Tema

**Route:** `app/play/theme/page.tsx`

- Grid kartu tema dari tabel `Theme` (`isEnabled: true`). MVP: 1 kartu, "Wanderer's Path", dengan preview art board
- Klik kartu tema → simpan pilihan (state client sementara / query param) → lanjut ke `app/play/room/page.tsx` (create/join)
- Arsitektur harus data-driven: menambah tema baru = insert row `Theme` baru + upload aset, **tidak perlu ubah kode UI ini**. Ini penting karena tema berikutnya akan ditambah lewat `prompt_khusus_update_tema.md`, bukan lewat rewrite halaman.

**Kriteria selesai:** Menambahkan row `Theme` baru langsung muncul sebagai kartu baru tanpa deploy ulang kode UI.

---

## Fase 5 — Sistem Room

**Route:** `app/play/room/page.tsx` (create/join), `app/room/[code]/page.tsx` (lobby & gameplay)

- **Create Room:** generate kode 6 karakter dari alfabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (tanpa `0/O/1/I/L`), cek unik di DB, buat `Room` dengan `themeId` dari Fase 4, `hostUserId` = user saat ini
- **Join Room:** input kode → validasi room ada, `status: LOBBY`, belum penuh (`players.length < 8`)
- Setup channel Pusher `presence-room-{code}` — subscribe saat masuk lobby, broadcast event `player-joined`, `player-left`, `player-ready`, `player-picked-character`
- Lobby UI: daftar pemain live, badge karakter yang sudah dipilih (kalau ada), tombol "Ready", tombol "Mulai Game" (host only, aktif kalau ≥2 pemain semua ready)
- Room auto-`ABANDONED` kalau tidak ada aktivitas >2 jam (cek lazy saat room diakses, bandingkan `updatedAt`)

**Kriteria selesai:** Buka 2 tab browser berbeda (2 akun Google berbeda), join room yang sama, lihat kehadiran satu sama lain real-time tanpa refresh manual.

---

## Fase 6 — Roster Karakter, Kustomisasi, & Prompt Art Generation

### 6.1 Gaya Visual Dasar (dipakai di SEMUA sprite karakter)

```
Chibi pixel art RPG character sprite, 2-head-tall chibi proportions,
thick 1px black pixel outline, flat cel-shaded color fill with simple
2-tone shading, no gradients, no anti-aliasing blur, simple dot-and-line
facial features, soft rounded ambient drop shadow ellipse beneath feet,
fully transparent background, base resolution 32x32px per frame (export
at 4x for crisp upscaling). Spritesheet layout: 4 rows x 3 columns —
row 1 = facing down/front (idle + 2 walk frames), row 2 = facing left
(3 walk frames), row 3 = facing right (3 walk frames), row 4 = facing
up/back (idle + 2 walk frames). No text, no watermark, no background
scenery, no drop shadow blur.
```

Simpan sebagai konstanta `ART_STYLE_BASE` di `lib/character-art-prompts.ts`, dipakai sebagai prefix untuk semua prompt di bawah.

### 6.2 Delapan Karakter

Untuk tiap karakter: seed ke tabel `Character`, dan simpan prompt art-nya (dipakai kalau generate ulang/variasi aset lewat image model yang tersedia).

| Slug | Nama | Role Strategi | Ability (mekanik lengkap ada di § 6.3) |
|---|---|---|---|
| `dawn` | Dawn — Ksatria Manusia | Defense | Guardian's Ward |
| `wren` | Wren — Mistikus Elf | Luck | Foresight |
| `thistle` | Thistle — Penjaga Dwarf | Defense (pasif) | Stone Stance |
| `brack` | Brack — Petarung Orc | Offense (pasif) | Retaliation |
| `ember` | Ember — Prajurit Dragonkin | Risk/Reward | Scorch Rush |
| `marrow` | Marrow — Pengembara Skeleton | Comeback | Second Wind |
| `sable` | Sable — Bayangan Berkerudung | Evasion | Vanish |
| `halcyon` | Halcyon — Ranger Centaur | Mobility | Swift Stride |

**Prompt art per karakter** (tempel `ART_STYLE_BASE` + baris di bawah):

1. **Dawn:** `Light skin human knight, short brown hair, polished silver plate armor, small blue cape, round shield with a simple sun emblem, confident calm expression.`
2. **Wren:** `Pale-skinned elf, long silver-lavender hair, visible pointed ears, deep purple robe with faint rune patterns, small wooden staff topped with a glowing crystal.`
3. **Thistle:** `Stocky dwarf with wider chibi frame, grey braided beard, bronze-and-iron plate armor, large tower shield strapped on back, sturdy stance.`
4. **Brack:** `Green-skinned orc, small visible tusks, sleeveless leather-and-fur armor, holding a stone-headed club over one shoulder, tough expression.`
5. **Ember:** `Red-orange scaled dragonkin, small curved horns, tribal-patterned tunic, faint ember spark particles near feet, warm confident expression.`
6. **Marrow:** `Bone-white skeleton, tattered brown traveling cloak, small lit lantern hanging from belt, hollow but friendly eye sockets.`
7. **Sable:** `Fully hooded figure in solid black cloak, only a thin sliver of pale face visible under the hood, minimal silhouette, mysterious.` *(karakter ini sudah punya referensi aset — kalau ada file sprite yang sudah diupload user, pakai itu langsung, jangan generate ulang.)*
8. **Halcyon:** `Centaur ranger — chibi human torso with light tan skin and simple practical vest and small bow on back, atop a small brown horse-body base scaled to match chibi proportions.`

### 6.3 Mekanik Ability (implementasi)

Simpan trigger logic di `lib/game/abilities.ts`, satu fungsi murni per ability, gampang di-unit-test:

```ts
// Signature konsisten untuk semua ability
type AbilityContext = {
  actingPlayer: RoomPlayerState;
  allPlayers: RoomPlayerState[];
  pendingEffect: TileEffect | null; // efek yang mau di-modifikasi/diblok
};
type AbilityResult = { modifiedEffect: TileEffect | null; usedCharge: boolean };
```

| Ability | Logika |
|---|---|
| Guardian's Ward (Dawn) | Aktif manual sebelum efek hazard diproses. Kalau dipakai: `modifiedEffect.magnitude = 0`. `usedAbility = true` permanen sisa match. |
| Foresight (Wren) | Aktif manual setelah dadu di-roll, sebelum digerakkan: server re-roll, tampilkan hasil baru. 1x/match. |
| Stone Stance (Thistle) | Pasif, otomatis di server tiap kali `effectType === "hazard"` kena karakter ini: `magnitude = Math.ceil(magnitude / 2)`. |
| Retaliation (Brack) | Pasif, otomatis: kalau ada Action Card jenis "hostile" (misal Swap paksa) menyasar Brack, target dibalik ke `casterId`. |
| Scorch Rush (Ember) | Pasif permanen: tiap dice roll `+1` (dihitung server). Kalau `effectType === "hazard"` kena Ember: `magnitude *= 2`. |
| Second Wind (Marrow) | Pasif, 1x/match: kalau `toTile` hasil hazard `=== 1` (reset total), ganti jadi milestone terakhir yang pernah dilewati (`Math.floor(lastPosition / 10) * 10`). |
| Vanish (Sable) | Aktif manual: set `isUntargetable = true` selama 1 ronde penuh (sampai giliran Sable berikutnya). Card hostile yang menyasar Sable saat status ini aktif otomatis gagal. |
| Swift Stride (Halcyon) | Aktif manual setelah landing normal (bukan setelah hazard/boost): tambahkan `1–3` tile pilihan pemain sendiri, divalidasi server tidak melebihi tile 100. |

### 6.4 Sistem Kustomisasi (2D, bukan 3D)

- Di lobby room, tiap pemain pilih 1 dari 8 karakter yang belum dipilih pemain lain di room yang sama (constraint `@@unique([roomId, characterId])` sudah menjamin di level DB, tapi validasi juga di UI biar pesan errornya jelas)
- **Palette-swap kosmetik:** siapkan 3–4 varian warna per karakter sebagai indexed color mapping (CSS filter `hue-rotate`/`saturate` yang di-precompute jadi varian statis, ATAU 3-4 versi spritesheet by-hand — pilih pendekatan yang lebih murah dari sisi aset; kalau pakai CSS filter, precompute dan cache hasilnya, jangan filter real-time tiap render)
- Aksesoris toggle (opsional per karakter, misal topi/cape alternatif) — murni kosmetik, tidak memengaruhi `abilityName`
- `RoomPlayer.cosmeticVariant` menyimpan pilihan ini

**Kriteria selesai fase ini:** Semua 8 karakter muncul di layar pilih karakter dengan sprite idle animasi, ability ter-render sebagai teks jelas + ikon, dan tidak ada 2 pemain di room yang sama bisa pilih karakter yang sama.

---

## Fase 7 — Core Game Engine

**Server logic:** `lib/game/engine.ts` (pure functions, unit-testable), dipanggil dari Server Action `app/room/[code]/_actions/roll-dice.ts` dll.

### 7.1 Board

- 100 tile, boustrophedon (baris 1 kiri→kanan, baris 2 kanan→kiri, dst — standar ular tangga)
- Definisikan tile map statis: daftar posisi Hazard (Shadow Vine), Boost (Ancient Ladder), Event, Power-up — simpan sebagai konstanta `BOARD_LAYOUT` (bukan random tiap game, biar bisa di-desain seimbang dan tidak berubah antar match untuk MVP)
- Precompute koordinat pixel tiap tile SEKALI saat komponen board mount (lihat `AGENTS.md` § 3, larangan `getBoundingClientRect()` di loop animasi)

### 7.2 Alur 1 Giliran (server-authoritative, lihat `SAR.md` § 4)

1. Client kirim aksi "roll" (tanpa payload angka apa pun)
2. Server validasi: apakah `userId` ini giliran sekarang di room ini?
3. Server `roll = crypto-safe random 1-6` (tambahkan modifier pasif seperti Scorch Rush di sini)
4. Server hitung `toTile`, cek apa yang ada di tile tujuan (hazard/boost/event/power-up), terapkan modifier ability pasif (Stone Stance, Retaliation, Second Wind)
5. Server tulis `GameMove`, update `RoomPlayer.position`, broadcast via Pusher event `turn-resolved` berisi seluruh detail (dice, path tile-demi-tile, effect yang terjadi) — client HANYA memutar animasi berdasar data ini
6. Cek kondisi menang (`position >= 100`) → kalau menang, update `Room.status = FINISHED`, `RoomPlayer.isWinner = true`, broadcast `game-finished`
7. Majukan `Room.currentTurnIndex` ke pemain berikutnya

### 7.3 Action Card (power-up)

- `heldCards` di `RoomPlayer` (JSON array id card) — pemain bisa pakai kapan saja via tombol terpisah di luar giliran-nya sendiri KECUALI kartu yang memang butuh trigger spesifik (misal Aegis harus dipakai sebelum efek hazard diproses — kalau dipegang, tawarkan opsi "pakai Aegis?" sesaat sebelum efek diterapkan)
- 4 jenis: `blink` (+5 tile langsung), `aegis` (blokir 1 hazard berikutnya), `mirror-ward` (pantulkan 1 card hostile berikutnya), `swap` (tukar posisi dengan pemain pilihan)

**Kriteria selesai:** Tulis unit test untuk `lib/game/engine.ts` — minimal: resolusi hazard normal, resolusi hazard dengan Stone Stance, resolusi dengan Scorch Rush (dadu +1 dan penalti 2x), kondisi menang di tile 100 tepat, kondisi overshoot tile 100 (tentukan aturan: mentok di 100 atau harus pas — putuskan salah satu, dokumentasikan di komentar kode).

---

## Fase 8 — Animasi & Cutscene

Ikuti prinsip performa dari `AGENTS.md` § 3 (Sprite & Animasi): precompute koordinat, animate `transform` saja, hormati `prefers-reduced-motion`.

| Momen | Spesifikasi Implementasi |
|---|---|
| **Roll dadu** | Komponen dadu 3D-ish pakai CSS `transform: rotateX/rotateY` looping cepat (~150ms/frame, 4-6 frame) lalu berhenti di hasil akhir dari server. Angka besar (`dice-value` token) muncul sesaat sesudahnya. |
| **Token bergerak** | Framer Motion `animate` berurutan per tile (array koordinat dari `BOARD_LAYOUT`), durasi ~250-300ms per hop, sprite pakai CSS `steps(3)` walk-cycle sesuai arah (kiri/kanan/atas/bawah ditentukan dari delta antar tile berurutan). |
| **Kena Shadow Vine** | Urutan: (1) jeda 300ms di tile hazard, (2) board container shake ringan (`x: [0,-4,4,-4,0]`, 200ms), (3) vignette gelap radial fade in/out (400ms, warna dari token `hazard` di `DESIGN.md`), (4) token hop mundur tile-demi-tile ke posisi baru (walk-cycle sedikit lebih cepat dari normal), (5) partikel kecil "terhisap bayangan" di tile pendaratan. Total ~1.2-1.5s, skippable via tap. |
| **Naik Ancient Ladder** | Sprite pakai frame menghadap-atas (row 4 spritesheet) selama bergerak naik tile-demi-tile, ditambah partikel cahaya kecil naik dari token (warna token `boost`). ~700ms-1s. |
| **Ability aktif** | VFX unik per karakter (lihat § 6.2 tiap karakter untuk deskripsi visual), overlay singkat 400-600ms di atas token, tidak menghalangi board. |
| **Menang** | Token bounce scale `[1, 1.15, 1]` 3x, confetti partikel kotak-kotak kecil warna dari palet tema, modal hasil akhir muncul dengan fade+slide up. |
| **Ganti giliran** | Highlight ring di avatar pemain aktif (di area lobby-bar), kamera board pan halus ke posisi token pemain aktif kalau di luar viewport. |

Semua cutscene: implementasikan sebagai komponen terpisah yang menerima data hasil dari server (bukan menghitung ulang logic apa pun) — animasi murni presentasional. Sediakan `motion-safe:` / cek `prefers-reduced-motion` untuk mempercepat/menghilangkan shake dan partikel non-esensial.

**Kriteria selesai:** Mainkan 1 game penuh dari awal sampai menang di HP low-end (throttle CPU 4x di DevTools) — animasi tidak drop di bawah ~30fps, tidak ada layout shift saat token bergerak.

---

## Fase 9 — Polish & QA

Checklist dari `AGENTS.md` § 5 (Definition of Done), jalankan untuk SELURUH aplikasi sebelum deploy:

- [ ] `npx next build` bersih
- [ ] Test di viewport 375px, semua tap target ≥44×44px
- [ ] Review terhadap Vercel Web Interface Guidelines
- [ ] Tidak ada `console.error` di flow: login → dashboard → pilih tema → create/join room → main sampai selesai
- [ ] `SAR.md` § 6 Pre-Launch Security Checklist — semua tercentang
- [ ] Semua sprite pakai `image-rendering: pixelated`, tidak ada yang blur

---

## Fase 10 — Deploy

- Deploy ke Vercel, team `team_tbgZxv4K2WYJ9ERvprAqi7Ke`
- Set semua environment variable dari `.env.example` di Vercel dashboard (production + preview)
- Jalankan `npx prisma migrate deploy` sebagai bagian build step
- Set minimal 1 user jadi `role: ADMIN` manual lewat Prisma Studio/skrip seed setelah deploy pertama
- Smoke test end-to-end di URL production sebelum dibagikan ke orang lain

---

## Yang JANGAN Dikerjakan Sekarang

- Mode spectator / voting TikTok Live (lihat `PRD.md` § 2)
- Tema kedua dan seterusnya (nanti lewat `prompt_khusus_update_tema.md`)
- Sistem unlock/monetisasi apa pun
