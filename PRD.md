# PRD — PixelAscend

## 1. Visi Produk

Ular tangga digital yang terasa seperti game RPG kecil, bukan sekadar konversi board fisik ke layar. Chibi pixel art, karakter punya kemampuan unik, papan punya event & power-up, dan setiap momen penting (kena jebakan, naik tangga, menang) punya cutscene singkat biar terasa hidup.

## 2. Tujuan & Non-Tujuan

**Tujuan MVP:**
- Bisa dimainkan rame-rame (2–8 orang) dari HP masing-masing, real-time turn-based
- Landing page yang meyakinkan orang buat login dan main
- Dashboard pribadi yang bikin orang balik lagi (lihat statistik, ganti profil)
- Admin panel fungsional buat moderasi
- Satu tema penuh (art, warna, board) yang solid — bukan lima tema setengah jadi
- Delapan karakter dengan kemampuan yang benar-benar mengubah strategi, bukan cuma beda warna

**Non-Tujuan (ditunda, JANGAN dikerjakan di MVP):**
- Mode spectator / voting penonton TikTok Live
- Sistem tema lain di luar 1 tema default (arsitektur harus siap, tapi kontennya nanti)
- Ranked/leaderboard global antar-room
- In-app purchase / monetisasi apa pun
- Chat in-game (kalau ada waktu lebih boleh, tapi bukan prioritas)

## 3. Target Pengguna & Platform

- Pemain: teman-teman Bayu, komunitas Muda/i Al-Mubarok II, audiens TikTok/YouTube Bayu
- Device utama: **HP** (mobile-first, wajib nyaman di layar kecil — Bayu sendiri develop dari HP)
- Browser modern, tidak perlu install apa pun

## 4. Peran Pengguna

| Peran | Deskripsi |
|---|---|
| **Guest (belum login)** | Cuma bisa lihat landing page. Semua fitur lain wajib login. |
| **Player** | User biasa setelah login Google. Bisa main, custom profil, lihat statistik. |
| **Admin** | Role khusus, di-set manual di database (bukan self-service). Akses `/admin`, tidak ada link publik ke sana. |

## 5. Alur Pengguna Utama (End-to-End)

```
Landing Page (belum login)
   │  klik "Sign in with Google"
   ▼
Google OAuth
   ▼
Dashboard User
   │  klik "Main Sekarang"
   ▼
Pilih Tema  (MVP: cuma 1 opsi, tetap tampilkan sebagai layar pilihan)
   ▼
Buat Room (dapat kode acak 6 karakter)  ATAU  Join Room (masukkan kode)
   ▼
Room Lobby
   │  pilih karakter + kustomisasi kosmetik
   │  tunggu semua ready
   ▼
Host klik "Mulai"
   ▼
Gameplay (giliran bergantian, dice roll, event, power-up, ability)
   ▼
Layar Kemenangan (cutscene menang + rekap)
   ▼
Kembali ke Dashboard (statistik ter-update)
```

## 6. Fitur — Landing Page & Auth

- Hero section menampilkan preview karakter pixel art + tagline
- Highlight fitur singkat (multiplayer, karakter unik, animasi)
- CTA tunggal: **"Sign in with Google"** — tidak ada opsi login lain di MVP
- Setelah login sukses → redirect ke `/dashboard`

## 7. Fitur — Dashboard User

- Nama & foto profil (dari Google, bisa di-override)
- **Statistik:** total game dimainkan, total menang, win rate
- **Ganti nickname** — 3–20 karakter, alfanumerik + spasi, validasi sisi server
- **Ganti foto profil** — upload dari galeri/lokal HP, preview crop, resize klien sebelum upload
- Riwayat pertandingan singkat (opsional tapi disarankan: 5 game terakhir — karakter dipakai, hasil, tanggal)
- Tombol besar "Main Sekarang" → ke alur pilih tema

## 8. Fitur — Admin Panel

**Wajib tidak bisa diakses publik.** Detail proteksi ada di `SAR.md` — di sini hanya cakupan fungsional.

- Dashboard ringkas: jumlah user, room aktif, game selesai hari ini
- Manajemen user: cari user, lihat detail, suspend/unsuspend
- Moderasi room: lihat room aktif/selesai, force-end room bermasalah
- Manajemen katalog: enable/disable karakter, enable/disable tema (untuk saat tema >1 nanti)
- Audit log: siapa admin melakukan aksi apa, kapan

## 9. Fitur — Pemilihan Tema

- Layar setelah dashboard, sebelum create/join room
- Grid kartu tema dengan preview art. MVP: 1 kartu ("Wanderer's Path" — lihat `DESIGN.md`), sisanya nanti nambah lewat `prompt_khusus_update_tema.md`
- Tema yang dipilih **host** menentukan tema seluruh room (semua pemain di room yang sama lihat tema yang sama)
- Setelah pilih tema → lanjut ke Create Room / Join Room

## 10. Fitur — Sistem Room

- **Create Room:** generate kode 6 karakter (huruf besar + angka, exclude karakter ambigu `0/O/1/I/L`), host otomatis masuk lobby
- **Join Room:** input kode, validasi room masih ada & belum penuh & belum mulai
- **Lobby:** daftar pemain real-time (join/leave live update), tiap pemain pilih karakter (tidak boleh duplikat dalam 1 room), tombol "Ready"
- Host melihat tombol "Mulai Game" — aktif kalau semua pemain ready dan minimal 2 pemain
- Room otomatis expired/dibersihkan kalau tidak ada aktivitas > 2 jam

## 11. Fitur — Roster Karakter (8 karakter)

Semua karakter dalam gaya chibi pixel art konsisten (lihat `DESIGN.md` untuk spesifikasi visual & `OPENCODE_BUILD_PROMPT.md` bagian karakter untuk prompt art generation per karakter).

| # | Nama | Arketipe | Peran Strategi | Kemampuan | Trigger |
|---|---|---|---|---|---|
| 1 | **Dawn** | Ksatria Manusia | Defense | **Guardian's Ward** — blokir penuh 1 efek hazard | Aktif, 1x/match |
| 2 | **Wren** | Mistikus Elf | Luck | **Foresight** — reroll dadu setelah lihat hasil | Aktif, 1x/match |
| 3 | **Thistle** | Penjaga Dwarf | Defense | **Stone Stance** — kena hazard cuma turun setengah jarak | Pasif, otomatis |
| 4 | **Brack** | Petarung Orc | Offense | **Retaliation** — kartu jahat dari pemain lain balik ke pengirim | Pasif, otomatis |
| 5 | **Ember** | Prajurit Dragonkin | Risk/Reward | **Scorch Rush** — dadu selalu +1, tapi penalti hazard 2x | Pasif, permanen |
| 6 | **Marrow** | Pengembara Skeleton | Comeback | **Second Wind** — reset pertama ke tile 1 berhenti di milestone terakhir | Otomatis, 1x/match |
| 7 | **Sable** | Bayangan Berkerudung | Evasion | **Vanish** — kebal dari kartu serangan pemain lain selama 1 ronde | Aktif, 1x/match |
| 8 | **Halcyon** | Ranger Centaur | Mobility | **Swift Stride** — setelah landing, boleh maju 1–3 tile tambahan (pilih sendiri) | Aktif, 1x/match |

Detail mekanik & spek art lengkap: lihat `OPENCODE_BUILD_PROMPT.md` § Fase 6.

## 12. Fitur — Kustomisasi Karakter

- Di lobby, tiap pemain pilih 1 karakter dari 8 roster (unik per room, gak boleh duplikat)
- **Kustomisasi kosmetik** (bukan 3D — palette-swap 2D di atas sprite pixel art):
  - Ganti palet warna outfit (3–4 varian per karakter, disiapkan sebagai indexed color swap)
  - Toggle aksesoris kecil (topi/cape/senjata skin) — opsional, tidak mengubah ability
  - Nickname tag di bawah token (auto dari nickname dashboard)
- Kemampuan (ability) **terkunci per karakter**, tidak bisa dikustomisasi — ini yang jaga balance

## 13. Fitur — Papan & Gameplay Inti

- Board 10×10 (100 tile), penomoran boustrophedon standar ular tangga
- Giliran otomatis sesuai urutan join, dice di-roll **di server** (anti-cheat, lihat `SAR.md`)
- **Hazard tile** ("Shadow Vine") — reskin dari ular, turun ke tile lebih rendah
- **Boost tile** ("Ancient Ladder") — reskin dari tangga, naik ke tile lebih tinggi
- **Event tile** (efek otomatis begitu berhenti di tile):
  - Rockslide → mundur 2
  - Wisp's Blessing → maju 3
  - Creeping Fog → skip giliran berikutnya
  - Swiftness Brew → dadu ganda giliran berikutnya
- **Power-up tile** ("Ancient Chest") — dapat 1 Action Card acak, disimpan, dipakai kapan saja lewat tombol:
  - Blink — teleport maju 5 tile
  - Aegis — blokir 1 hazard berikutnya
  - Mirror Ward — pantulkan 1 kartu jahat berikutnya yang menyasar dirimu
  - Swap — tukar posisi dengan pemain pilihan
- Menang: pemain pertama yang mencapai tile 100 ("Summit")

## 14. Fitur — Animasi & Cutscene

Detail teknis di `AGENTS.md` § Animasi. Ringkasan requirement produk:

| Momen | Animasi |
|---|---|
| Roll dadu | Animasi dadu 3–4 frame + suara |
| Token bergerak | Sprite walk-cycle langkah-demi-langkah sepanjang path (bukan lompat instan) |
| Kena Shadow Vine | Cutscene singkat: sprite "tertarik", layar shake ringan, token turun tile-demi-tile, vignette gelap sesaat |
| Naik Ancient Ladder | Animasi memanjat + partikel cahaya naik |
| Ability aktif | VFX unik per karakter (lihat § 11 & build prompt) |
| Menang | Cutscene kemenangan singkat + confetti pixel |
| Ganti giliran | Highlight/pan kamera ke avatar pemain aktif |

## 15. Metrik Sukses (ringan, opsional untuk dilacak)

- Jumlah room dibuat / hari
- Completion rate (room yang selesai vs dibuat)
- Rata-rata durasi 1 match

## 16. Roadmap Setelah MVP

1. Mode spectator + voting TikTok Live
2. Tema kedua, ketiga, dst. (via `prompt_khusus_update_tema.md`)
3. Roster karakter tambahan
4. Chat in-game
5. Sistem unlock tema/kosmetik lewat pencapaian
