# Template: Tambah Tema Baru — PixelAscend

**Cara pakai:** Isi semua bagian di bawah ini (hapus contoh placeholder-nya, ganti dengan punya kamu). Kalau ada foto referensi, lampirkan/upload bareng file ini. Setelah semua terisi, **paste seluruh isi file ini ke OpenCode** dengan instruksi tambahan: *"Tambahkan tema baru ke PixelAscend sesuai spesifikasi ini, ikuti arsitektur tema yang sudah ada di `SAR.md` § 3 (model `Theme`) dan konvensi di `DESIGN.md`/`AGENTS.md`."*

Tema saat ini yang sudah ada: **Wanderer's Path** (default, lihat `DESIGN.md`). Isi di bawah untuk tema tambahan.

---

## 1. Identitas Tema

- **Theme ID (slug, huruf kecil-strip):** _____________________ (contoh: `frozen-peaks`)
- **Nama tampilan (Inggris, gaya pixel art, bukan "kingdom"):** _____________________
- **Deskripsi singkat (1–2 kalimat lore/nuansa):**
  _____________________________________________________________

## 2. Referensi Visual

- **Link/lampiran gambar referensi:** _____________________
- **Catatan gaya:** Apakah masih chibi pixel art konsisten dengan roster default (lihat `PRD.md` §11), atau ada penyesuaian gaya? _____________________

## 3. Palet Warna Tema

- **Primary (background utama):** #_______
- **Accent (setara `tertiary` di `DESIGN.md`):** #_______
- **Hazard tile:** #_______
- **Boost tile:** #_______

*(Kalau tidak diisi, default ikut token `DESIGN.md` yang sudah ada.)*

## 4. Aset Board yang Dibutuhkan

- [ ] Background board (ukuran mengikuti board 10×10 yang sudah ada)
- [ ] Art tile Hazard (reskin "Shadow Vine")
- [ ] Art tile Boost (reskin "Ancient Ladder")
- [ ] Ikon tile Event (4 jenis: mundur/maju/skip/dadu-ganda — lihat `PRD.md` §13)
- [ ] Ikon tile Power-up (reskin "Ancient Chest")

## 5. Audio (opsional)

- **Musik latar:** _____________________
- **SFX:** roll dadu / kena hazard / naik boost / menang — _____________________

## 6. Skin Karakter untuk Tema Ini (opsional)

- [ ] Roster tetap pakai sprite default (tidak reskin karakter)
- [ ] Reskin karakter khusus tema ini — kalau ya, catat per karakter:
  - Dawn: _____________________
  - Wren: _____________________
  - Thistle: _____________________
  - Brack: _____________________
  - Ember: _____________________
  - Marrow: _____________________
  - Sable: _____________________
  - Halcyon: _____________________

## 7. Syarat Unlock (opsional, untuk fase setelah MVP)

- [ ] Gratis, langsung tersedia
- [ ] Unlock setelah menang N kali: _____
- [ ] Unlock via kode khusus: _____________________

---

**Status pengisian saat ini:** hanya 1 tema (Wanderer's Path, default) yang perlu selesai untuk MVP. File ini disiapkan untuk saat kamu mau nambah tema kedua dan seterusnya — tidak perlu diisi sekarang.
