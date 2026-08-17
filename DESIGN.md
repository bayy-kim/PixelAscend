---
version: alpha
name: PixelAscend — Wanderer's Path
description: Chibi pixel-art dark fantasy. Papan dan sprite terasa seperti game indie retro sungguhan, UI di sekitarnya modern dan gampang dibaca di HP kecil — bukan dashboard SaaS yang ditempeli ikon pixel.
colors:
  primary: "#1B1A1F"
  secondary: "#4B4A57"
  tertiary: "#E8A33D"
  neutral: "#F2E9D8"
  hazard: "#7C4DA8"
  boost: "#5FA35A"
  danger: "#C24A4A"
  surface: "#232129"
typography:
  display:
    fontFamily: "Press Start 2P"
    fontSize: 2rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.02em"
  h1:
    fontFamily: "Press Start 2P"
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.01em"
  h2:
    fontFamily: "Geist Sans"
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: "Geist Sans"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Geist Sans"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  dice-value:
    fontFamily: "Press Start 2P"
    fontSize: 2.5rem
    fontWeight: 400
    lineHeight: 1
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "#F2B75C"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: 16px
  board-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.none}"
    width: 32px
    height: 32px
  board-tile-hazard:
    backgroundColor: "{colors.hazard}"
    rounded: "{rounded.none}"
  board-tile-boost:
    backgroundColor: "{colors.boost}"
    rounded: "{rounded.none}"
  character-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 12px
  admin-badge:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: 4px
---

## Overview

PixelAscend punya dua "lapisan" visual yang harus dijaga terpisah tapi tetap konsisten:

1. **Lapisan game** (board, sprite karakter, tile, cutscene) — harus terasa seperti pixel art indie retro asli: sudut tajam, outline tegas, palet warna terbatas, tanpa blur.
2. **Lapisan chrome UI** (landing page, dashboard, admin, form) — modern, gampang dibaca di layar kecil, kontras tinggi, tapi tetap memakai palet warna yang sama biar tidak terasa seperti dua aplikasi berbeda yang ditempel jadi satu.

Kesalahan yang harus dihindari: memakai gradient generik ungu-biru atau glassmorphism berlebihan di belakang sprite pixel art. Itu kombinasi yang langsung terlihat seperti "AI slop" — sprite pixel art justru paling kuat di atas background flat/solid atau tekstur pixel juga (mis. langit gradasi band warna terbatas, bukan gradasi halus).

## Colors

- **Primary (`#1B1A1F`):** Charcoal hangat, dasar hampir semua background gelap — panel, halaman utama, board frame.
- **Secondary (`#4B4A57`):** Abu kebiruan redup, untuk elemen sekunder — border, divider, teks nonaktif.
- **Tertiary (`#E8A33D`):** Amber/emas — satu-satunya warna yang dipakai untuk aksi utama (tombol CTA, highlight giliran aktif, glow item power-up). Dipakai hemat, bukan di mana-mana.
- **Neutral (`#F2E9D8`):** Parchment pucat, warna teks utama di atas background gelap.
- **Hazard (`#7C4DA8`):** Ungu bayangan — warna tile Shadow Vine dan efek negatif.
- **Boost (`#5FA35A`):** Hijau lumut terang — warna tile Ancient Ladder dan efek positif.
- **Danger (`#C24A4A`):** Merah bata — status error, badge admin, tombol destruktif.
- **Surface (`#232129`):** Sedikit lebih terang dari primary, untuk kartu/panel yang perlu terlihat "naik" dari background.

Jalankan `npx -y @google/design.md lint DESIGN.md` setelah perubahan warna apa pun untuk verifikasi kontras WCAG — terutama kombinasi `button-primary` (amber di atas charcoal) dan teks di atas `board-tile-hazard`/`board-tile-boost`.

## Typography

Prinsip: **font pixel (`Press Start 2P`) hanya untuk display, heading singkat, dan angka besar (nilai dadu, nomor tile, judul layar).** Untuk semua body text, label form, deskripsi kartu — pakai `Geist Sans` (sudah dipakai di proyek lain Bayu). Font pixel yang dipaksakan untuk paragraf panjang sulit dibaca di layar HP kecil dan justru merusak kesan profesional, bukan menambah.

- `display` — judul hero landing page, nama room/tema di layar besar
- `h1` — judul section dalam game (pixel font, ukuran kecil, tetap terbaca)
- `h2` — judul section di dashboard/admin (Geist Sans, lebih ramah baca)
- `body-md` / `body-sm` — semua teks isi
- `dice-value` — angka hasil dadu, ditampilkan besar sesaat setelah roll

## Layout

- Mobile-first, breakpoint mengikuti Tailwind default (`sm` 640px, `md` 768px, `lg` 1024px).
- Board game di layar HP: board mengambil lebar penuh viewport dikurangi padding `spacing.md`, tile dihitung otomatis (`viewport_width / 10`), minimum 28px per tile biar tetap kebaca di HP kecil.
- Safe area: semua tombol aksi penting (roll dadu, pakai ability) diletakkan di bagian yang tidak tertutup navigasi gesture bawah layar.

## Elevation & Depth

- Lapisan game: **tanpa shadow** — pixel art memakai outline tegas untuk memisahkan elemen, bukan drop shadow blur (blur merusak ketajaman pixel).
- Lapisan chrome UI: shadow tipis (`shadow-sm`/`shadow-md` Tailwind) diperbolehkan untuk card dashboard/admin, sesuai konvensi modern UI.

## Shapes

- Lapisan game: `rounded.none` — sudut tajam di board tile, frame karakter, dialog cutscene (biar konsisten dengan estetika pixel).
- Lapisan chrome UI: `rounded.md`/`rounded.lg` untuk card, tombol, input — tetap terasa modern dan nyaman disentuh.

## Components

`button-primary` adalah satu-satunya aksi high-emphasis di tiap layar (contoh: "Sign in with Google" di landing, "Mulai Game" di lobby, "Roll Dadu" saat giliran). `button-secondary` untuk aksi kedua (batal, kembali). `board-tile-hazard`/`board-tile-boost` dipakai konsisten di seluruh board — jangan re-warnai manual per tile.

## Do's and Don'ts

**Do:**
- Pakai `image-rendering: pixelated` di semua sprite/tile art
- Batasi palet warna per adegan cutscene ke token di atas — jangan improvisasi warna baru di luar token
- Pakai `tertiary` (amber) hemat, sebagai penanda "ini yang paling penting di layar ini"

**Don't:**
- Jangan campur gaya flat pixel art dengan skeuomorphism/glassmorphism berlebihan
- Jangan pakai `display`/`h1` (font pixel) untuk paragraf panjang
- Jangan tambah warna gradient baru yang tidak ada di token di atas
- Jangan pakai drop shadow blur di elemen board/sprite
