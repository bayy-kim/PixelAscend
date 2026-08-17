# AGENTS.md — Guardrail Teknis PixelAscend

Baca file ini SEBELUM menulis kode apa pun. Ini kumpulan aturan yang wajib diikuti — sebagian berasal dari bug nyata yang sudah pernah terjadi di proyek Bayu yang lain, sebagian spesifik untuk game ini. Kalau ragu, cek dulu di sini sebelum improvisasi.

## 1. Baca Dulu Sebelum Mulai

1. `PRD.md` — fitur apa yang harus ada
2. `SAR.md` — arsitektur & keamanan (WAJIB untuk auth/admin/game engine)
3. `DESIGN.md` — token warna/tipografi/spacing resmi
4. File ini

## 2. Guardrail Lintas-Proyek (Sudah Terbukti Penting — Jangan Dilanggar)

- **Tailwind v4 CSS-first.** Tidak ada `tailwind.config.ts`. Semua token lewat `@theme` di `app/globals.css`.
- **Jangan pakai shorthand CSS `inset`** untuk elemen yang harus presisi di mobile (sering bikin masalah render mobile) — pakai `top`/`right`/`bottom`/`left` eksplisit kalau memang perlu, atau lebih baik pakai Flexbox/Grid positioning.
- **`useSearchParams()` WAJIB dibungkus `<Suspense>`.** Ini penyebab 8 deploy gagal di proyek lain — jangan diulang.
- **NextAuth v5: set `trustHost: true`** di config, wajib untuk deploy di Vercel.
- **`backdrop-filter` di ancestor dari elemen `position: fixed`** menyebabkan bug render — kalau butuh kombinasi ini, gunakan React Portal untuk elemen fixed-nya.
- **Pakai `100dvh`, bukan `100vh`** untuk elemen full-height di mobile (menghindari masalah address bar browser mobile yang berubah tinggi).
- **Touch target minimum 44×44px** untuk semua elemen interaktif (tombol dadu, tombol ability, kartu karakter) — ini game yang dimainkan dari HP.
- **Ikon HANYA dari `lucide-react`.** Tidak ada emoji sebagai ikon fungsional di mana pun (nav, tombol, status).
- **Semua nilai numerik game (posisi tile, hasil dadu, index giliran) adalah integer.** Tidak ada floating point di logic game.

## 3. Guardrail Spesifik PixelAscend

### Keamanan & Game Logic
- **Dice roll dan resolusi pergerakan 100% di server.** Client hanya memicu aksi ("saya roll"), tidak pernah mengirim hasil. Lihat `SAR.md` § 4.
- **Setiap Server Action/Route Handler admin panggil `requireAdmin()` di baris pertama** — jangan andalkan `middleware.ts` sendirian.
- **Validasi giliran** di server sebelum memproses aksi apa pun (roll, ability, pakai card).

### Sprite & Animasi Pixel Art
- **`image-rendering: pixelated`** wajib di semua elemen `<img>`/canvas yang menampilkan sprite pixel art — kalau tidak, browser akan blur sprite-nya waktu di-scale dan hilang kesan pixel-art-nya (kesalahan paling umum & paling merusak estetika).
- Sprite karakter memakai format spritesheet **4 baris (bawah/kiri/kanan/atas) × 3 kolom (frame jalan)**, animasi jalan pakai CSS `steps()` di `background-position` — bukan GIF, bukan render ulang komponen tiap frame.
- **Hitung koordinat pixel tiap tile board SEKALI saat setup (module-level constant atau di-generate saat render awal), jangan panggil `getBoundingClientRect()` di dalam loop animasi** — pengukuran DOM saat tween berjalan menyebabkan animasi desync dari layout asli.
- **Animasi token pakai Framer Motion, animate `x`/`y`/`scale` saja** (transform), jangan animate `top`/`left`/`width`/`height` — token bergerak lintas banyak tile berurutan, layout thrashing di sini sangat terasa lag-nya di HP low-end.
- Durasi micro-interaction (hover, tap feedback, transisi kartu): **150–300ms**. Cutscene (kena hazard, naik boost, menang): boleh lebih panjang (800ms–1.5s) tapi harus bisa di-skip/dipercepat kalau pemain tap layar.
- **Hormati `prefers-reduced-motion`** — sediakan versi animasi yang dipercepat/statis untuk pemain yang mengaktifkan setting ini di device-nya.
- Kalau nge-animate SVG (misal ikon dadu SVG), animate **wrapper `<div>`-nya**, bukan elemen `<svg>` itu sendiri langsung (lebih stabil lintas browser).

### Struktur & Performa
- Ikuti App Router convention standar: `app/(marketing)/page.tsx` untuk landing, `app/dashboard/`, `app/admin/`, `app/room/[code]/`, dst. Folder privat (helper, tidak routable) pakai prefix `_` (mis. `app/admin/_lib/`).
- Komponen berat (character customizer dengan canvas palette-swap, board renderer) pakai `next/dynamic`.
- Fetch data independen jalan paralel (`Promise.all`), bukan waterfall berurutan.
- State yang sering berubah tapi cuma dipakai di callback (misal posisi drag sementara saat kustomisasi) pakai `useRef`, jangan `useState` yang trigger re-render tiap frame.

### Upload & Storage
- Avatar: kompres & resize di klien (max 512×512) sebelum upload, **validasi ulang MIME + ukuran di server**, simpan di Vercel Blob.
- Nama file di-sanitize, tidak pernah pakai nama asli dari user mentah-mentah sebagai path.

## 4. Larangan Eksplisit (Jangan Pernah)

- ❌ Hardcode password/secret/fallback apa pun di kode
- ❌ Client mengirim hasil dadu atau hasil pergerakan — server yang menghitung
- ❌ Route `/admin` atau API admin tanpa `requireAdmin()` di dalam handler-nya sendiri
- ❌ Emoji sebagai ikon fungsional
- ❌ Font pixel (mis. "Press Start 2P") dipakai untuk body text panjang — cuma untuk display/heading/angka besar (lihat `DESIGN.md`)
- ❌ Gradient generik ungu-biru "AI slop" ditumpuk di belakang sprite pixel art — ini merusak keseluruhan nuansa retro yang justru jadi daya tarik game ini
- ❌ Sprite di-scale tanpa `image-rendering: pixelated`
- ❌ Endpoint debug/testing ikut ter-deploy ke production

## 5. Definition of Done

Sebelum bilang sebuah fase "selesai", cek:

- [ ] `npx next build` sukses tanpa error/warning
- [ ] Dicoba di viewport mobile sempit (~375px) — tidak ada horizontal scroll, semua tombol ≥44×44px
- [ ] Cek terhadap [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) untuk halaman yang baru dibuat
- [ ] Tidak ada `console.error` di browser saat flow utama dijalankan
- [ ] Struktur project sesuai checklist di skill `next-js-project-inspection` (semua file App Router wajib ada: `layout.tsx`, `page.tsx`, `globals.css`, `error.tsx`, `not-found.tsx`)
- [ ] Item relevan dari `SAR.md` § 6 (Pre-Launch Security Checklist) sudah dicentang untuk fitur yang baru dikerjakan
