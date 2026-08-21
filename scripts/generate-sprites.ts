import fs from 'fs';
import path from 'path';

// High-Detail Single-Pose 2D Pixel Chibi Generator (256x256 per character PNG)
// Built pixel-by-pixel on a 32x32 grid and scaled up 8x to 256x256 with crisp 8px blocks.
function generatePNG(width: number, height: number, drawPixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const bytesPerPixel = 4;
  const lineSize = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(height * lineSize);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y);
      const pixelOffset = lineOffset + 1 + x * bytesPerPixel;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const maxBlock = 65535;
  const numBlocks = Math.ceil(rawData.length / maxBlock);
  const zlibHeader = Buffer.from([0x78, 0x01]);
  const zlibBlocks: Buffer[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const start = i * maxBlock;
    const end = Math.min(rawData.length, start + maxBlock);
    const chunk = rawData.subarray(start, end);
    const isLast = i === numBlocks - 1 ? 1 : 0;
    const len = chunk.length;
    const header = Buffer.alloc(5);
    header[0] = isLast;
    header.writeUInt16LE(len, 1);
    header.writeUInt16LE(len ^ 0xffff, 3);
    zlibBlocks.push(header, chunk);
  }

  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < rawData.length; i++) {
    s1 = (s1 + rawData[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(((s2 << 16) | s1) >>> 0, 0);

  const compressedData = Buffer.concat([zlibHeader, ...zlibBlocks, adler]);

  const crc32Table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[n] = c >>> 0;
  }

  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function createChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const typeAndData = buf.subarray(4, 8 + len);
    const crcVal = crc32(typeAndData);
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

type RGBA = [number, number, number, number];

const OUTLINE: RGBA = [20, 18, 26, 255];
const SHADOW: RGBA = [0, 0, 0, 80];
const CLEAR: RGBA = [0, 0, 0, 0];

// Color Palettes (Preserved exact colors)
const DAWN_SKIN: RGBA = [235, 190, 150, 255];
const DAWN_HAIR: RGBA = [115, 65, 30, 255];
const DAWN_ARMOR: RGBA = [70, 110, 180, 255];
const DAWN_ACCENT: RGBA = [230, 190, 60, 255];
const DAWN_CAPE: RGBA = [40, 70, 140, 255];

const WREN_SKIN: RGBA = [240, 215, 190, 255];
const WREN_HAIR: RGBA = [210, 205, 230, 255];
const WREN_ROBE: RGBA = [120, 60, 170, 255];
const WREN_ACCENT: RGBA = [170, 130, 230, 255];

const THISTLE_SKIN: RGBA = [215, 170, 130, 255];
const THISTLE_BEARD: RGBA = [190, 190, 200, 255];
const THISTLE_ARMOR: RGBA = [130, 85, 45, 255];
const THISTLE_ACCENT: RGBA = [180, 110, 40, 255];

const BRACK_SKIN: RGBA = [95, 165, 75, 255];
const BRACK_HAIR: RGBA = [40, 55, 35, 255];
const BRACK_VEST: RGBA = [90, 65, 45, 255];
const BRACK_ACCENT: RGBA = [190, 180, 140, 255];

const EMBER_SKIN: RGBA = [210, 60, 45, 255];
const EMBER_BELLY: RGBA = [245, 175, 45, 255];
const EMBER_OUTFIT: RGBA = [140, 45, 35, 255];

const MARROW_BONE: RGBA = [235, 235, 225, 255];
const MARROW_CLOAK: RGBA = [85, 75, 65, 255];

const SABLE_HOOD: RGBA = [25, 22, 30, 255];
const SABLE_SKIN: RGBA = [220, 185, 150, 255];
const SABLE_EYE: RGBA = [190, 120, 250, 255];

const HALCYON_HUMAN_SKIN: RGBA = [220, 175, 135, 255];
const HALCYON_HAIR: RGBA = [95, 60, 35, 255];
const HALCYON_VEST: RGBA = [115, 80, 45, 255];
const HALCYON_HORSE: RGBA = [130, 80, 40, 255];
const HALCYON_HOOF: RGBA = [40, 25, 15, 255];

const BOOTS_DARK: RGBA = [60, 40, 25, 255];
const BOOTS_LIGHT: RGBA = [90, 60, 35, 255];
const EYE_DARK: RGBA = [25, 25, 30, 255];
const EYE_SHINE: RGBA = [255, 255, 255, 255];

// Grid size: 32x32, scale 8x -> 256x256
function renderCharacterGrid(charId: string, gx: number, gy: number): RGBA {
  // Common Feet Drop Shadow at gy 29..30
  if (gy >= 29 && gy <= 30 && gx >= 8 && gx <= 23 && charId !== "halcyon") {
    if ((gy === 30 && gx >= 9 && gx <= 22) || (gy === 29 && gx >= 11 && gx <= 20)) {
      return SHADOW;
    }
  }

  // =========================================================================
  // 1. DAWN (Human Knight: Plate armor, blue cape, sun shield in hand, separate arms & legs, boots)
  // =========================================================================
  if (charId === "dawn") {
    // Shield held in Left Hand (gx 4..8, gy 14..23)
    if (gx >= 4 && gx <= 8 && gy >= 14 && gy <= 23) {
      if (gx === 4 || gx === 8 || gy === 14 || gy === 23) return OUTLINE;
      if (gx === 6 && gy === 185) return [255, 240, 120, 255];
      return DAWN_ACCENT;
    }
    // Blue Cape at back/shoulders
    if ((gx === 9 || gx === 22) && gy >= 14 && gy <= 25) return OUTLINE;
    if ((gx === 8 || gx === 23) && gy >= 15 && gy <= 24) return DAWN_CAPE;

    // Hair & Bangs (gy 2..7)
    if (gy >= 2 && gy <= 7 && gx >= 9 && gx <= 22) {
      if (gy === 2 || (gy === 3 && (gx === 9 || gx === 22))) return OUTLINE;
      if (gy >= 5 && (gx === 10 || gx === 11 || gx === 14 || gx === 17 || gx === 20)) return DAWN_HAIR; // Spiky bangs
      if (gy <= 5) return DAWN_HAIR;
    }

    // Face (gy 6..12, gx 10..21)
    if (gy >= 6 && gy <= 12 && gx >= 10 && gx <= 21) {
      if (gx === 10 || gx === 21 || gy === 6 || gy === 12) return OUTLINE;
      // Eyes with shine
      if ((gy === 9 || gy === 10) && (gx === 13 || gx === 18)) return EYE_DARK;
      if ((gy === 9 || gy === 10) && (gx === 14 || gx === 19)) return EYE_SHINE;
      return DAWN_SKIN;
    }

    // Thin Neck Gap (gy 13)
    if (gy === 13 && gx >= 13 && gx <= 18) {
      if (gx === 13 || gx === 18) return OUTLINE;
      return DAWN_SKIN;
    }

    // Right Arm (gx 22..24, gy 14..21) & Right Hand (gx 22..24, gy 21..22)
    if (gx >= 22 && gx <= 24 && gy >= 14 && gy <= 22) {
      if (gx === 24 || gy === 14 || gy === 22) return OUTLINE;
      if (gy >= 21) return DAWN_SKIN; // Right Hand
      return DAWN_ARMOR;
    }

    // Torso Armor (gx 12..19, gy 14..22)
    if (gx >= 11 && gx <= 20 && gy >= 14 && gy <= 22) {
      if (gx === 11 || gx === 20 || gy === 14 || gy === 22) return OUTLINE;
      if (gy === 14) return DAWN_ACCENT; // Collar line
      return DAWN_ARMOR;
    }

    // Crotch Split Line (gx 15..16, gy 23..26)
    if ((gx === 15 || gx === 16) && gy >= 23 && gy <= 26) return OUTLINE;

    // Two Separate Legs (Left: gx 10..14, Right: gx 17..21, gy 23..26)
    if (gy >= 23 && gy <= 26) {
      if ((gx >= 10 && gx <= 14) || (gx >= 17 && gx <= 21)) {
        if (gx === 10 || gx === 14 || gx === 17 || gx === 21) return OUTLINE;
        return DAWN_ARMOR;
      }
    }

    // Boots (Left: gx 9..14, Right: gx 17..22, gy 27..29)
    if (gy >= 27 && gy <= 29) {
      if ((gx >= 9 && gx <= 14) || (gx >= 17 && gx <= 22)) {
        if (gx === 9 || gx === 14 || gx === 17 || gx === 22 || gy === 29) return OUTLINE;
        return BOOTS_DARK;
      }
    }
  }

  // =========================================================================
  // 2. WREN (Elf Mystic: Pointed ears out of hair, purple rune robe, staff in hand)
  // =========================================================================
  if (charId === "wren") {
    // Magic Staff in Right Hand (gx 24..26, gy 4..28)
    if (gx >= 24 && gx <= 26 && gy >= 4 && gy <= 28) {
      if (gy <= 7) return WREN_ACCENT; // Glowing crystal top
      if (gx === 25) return [100, 65, 35, 255]; // Staff wood
    }

    // Hair (gy 2..15)
    if (gy >= 2 && gy <= 15 && gx >= 8 && gx <= 23) {
      // Pointed Elf Ears sticking OUT of hair at gy 9..11 (gx 6..8 & gx 23..25)
      if ((gy >= 9 && gy <= 11) && ((gx >= 6 && gx <= 8) || (gx >= 23 && gx <= 25))) {
        if (gx === 6 || gx === 25 || gy === 9 || gy === 11) return OUTLINE;
        return WREN_SKIN; // Pointed ear skin
      }
      if (gy <= 7) return WREN_HAIR;
      if ((gx <= 10 || gx >= 21) && gy <= 15) return WREN_HAIR; // Strands
    }

    // Face (gy 6..12, gx 11..20)
    if (gy >= 6 && gy <= 12 && gx >= 11 && gx <= 20) {
      if (gx === 11 || gx === 20 || gy === 6 || gy === 12) return OUTLINE;
      if ((gy === 9 || gy === 10) && (gx === 13 || gx === 18)) return WREN_ROBE; // Purple eyes
      if ((gy === 9 || gy === 10) && (gx === 14 || gx === 19)) return EYE_SHINE;
      return WREN_SKIN;
    }

    // Neck Gap (gy 13)
    if (gy === 13 && gx >= 14 && gx <= 17) return WREN_SKIN;

    // Left Arm & Left Hand (gx 8..10, gy 14..22)
    if (gx >= 8 && gx <= 10 && gy >= 14 && gy <= 22) {
      if (gx === 8 || gy === 14 || gy === 22) return OUTLINE;
      if (gy >= 20) return WREN_SKIN; // Left Hand with fingers
      return WREN_ROBE;
    }

    // Torso Robe (gx 11..20, gy 14..26)
    if (gx >= 11 && gx <= 20 && gy >= 14 && gy <= 26) {
      if (gx === 11 || gx === 20 || gy === 14 || gy === 26) return OUTLINE;
      if (gy === 14) return WREN_ACCENT; // Collar line
      return WREN_ROBE;
    }

    // Crotch Split & Boots (gy 27..29)
    if ((gx === 15 || gx === 16) && gy >= 27 && gy <= 29) return OUTLINE;
    if (gy >= 27 && gy <= 29) {
      if ((gx >= 10 && gx <= 14) || (gx >= 17 && gx <= 21)) {
        if (gx === 10 || gx === 14 || gx === 17 || gx === 21 || gy === 29) return OUTLINE;
        return BOOTS_LIGHT;
      }
    }
  }

  // =========================================================================
  // 3. THISTLE (Dwarf Guardian: WAVY BEARD covering jaw to chest, bronze armor, 2 legs)
  // =========================================================================
  if (charId === "thistle") {
    // Hair & Head (gy 3..10, gx 9..22)
    if (gy >= 3 && gy <= 10 && gx >= 9 && gx <= 22) {
      if (gy === 3 || gx === 9 || gx === 22) return OUTLINE;
      if (gy <= 6) return THISTLE_BEARD;
      if ((gy === 8 || gy === 9) && (gx === 13 || gx === 18)) return EYE_DARK;
      if ((gy === 8 || gy === 9) && (gx === 14 || gx === 19)) return EYE_SHINE;
      return THISTLE_SKIN;
    }

    // WAVY BEARD MUST BE PRESENT (gx 8..23, gy 11..19) - covering jaw to upper chest!
    if (gy >= 11 && gy <= 19 && gx >= 8 && gx <= 23) {
      // Wavy/textured border
      if (gx === 8 || gx === 23 || gy === 19 || (gy === 18 && (gx === 9 || gx === 22))) return OUTLINE;
      // Beard texture wavy lines
      if ((gy === 14 || gy === 17) && gx % 2 === 0) return [160, 160, 175, 255];
      return THISTLE_BEARD;
    }

    // Arms & Hands (gx 6..8 & gx 23..25, gy 15..22)
    if (gy >= 15 && gy <= 22 && ((gx >= 6 && gx <= 8) || (gx >= 23 && gx <= 25))) {
      if (gx === 6 || gx === 25 || gy === 15 || gy === 22) return OUTLINE;
      if (gy >= 20) return THISTLE_SKIN; // Hands
      return THISTLE_ARMOR;
    }

    // Torso Bronze Armor below beard (gx 9..22, gy 20..24)
    if (gx >= 9 && gx <= 22 && gy >= 20 && gy <= 24) {
      if (gx === 9 || gx === 22 || gy === 24) return OUTLINE;
      return THISTLE_ARMOR;
    }

    // Two Separate Stocky Legs (Left: gx 9..14, Right: gx 17..22, gy 25..27)
    if ((gx === 15 || gx === 16) && gy >= 25 && gy <= 29) return OUTLINE;
    if (gy >= 25 && gy <= 27) {
      if ((gx >= 9 && gx <= 14) || (gx >= 17 && gx <= 22)) {
        if (gx === 9 || gx === 14 || gx === 17 || gx === 22) return OUTLINE;
        return THISTLE_ARMOR;
      }
    }

    // Boots (gy 27..29)
    if (gy >= 27 && gy <= 29) {
      if ((gx >= 8 && gx <= 14) || (gx >= 17 && gx <= 23)) {
        if (gx === 8 || gx === 14 || gx === 17 || gx === 23 || gy === 29) return OUTLINE;
        return BOOTS_DARK;
      }
    }
  }

  // =========================================================================
  // 4. BRACK (Orc Fighter: Tusks, exposed green muscular arms, stone club)
  // =========================================================================
  if (charId === "brack") {
    // Stone Club on shoulder (gx 22..27, gy 4..16)
    if (gx >= 22 && gx <= 27 && gy >= 4 && gy <= 16) {
      if (gy <= 9) {
        if (gx === 22 || gx === 27 || gy === 4 || gy === 9) return OUTLINE;
        return [110, 105, 100, 255]; // Stone head
      }
      if (gx === 24 || gx === 25) return [100, 65, 35, 255]; // Wood handle
    }

    // Head & Hair (gy 3..13, gx 9..22)
    if (gy >= 3 && gy <= 13 && gx >= 9 && gx <= 22) {
      if (gy === 3 || gx === 9 || gx === 22 || gy === 13) return OUTLINE;
      if (gy <= 6) return BRACK_HAIR;
      // Tusks sticking UP from mouth corners (gx 12 & gx 19, gy 11..12)
      if ((gy === 11 || gy === 12) && (gx === 12 || gx === 19)) {
        return [245, 245, 235, 255]; // White tusks
      }
      if ((gy === 9 || gy === 10) && (gx === 13 || gx === 18)) return BRACK_ACCENT; // Red eyes
      return BRACK_SKIN;
    }

    // Neck Gap (gy 14)
    if (gy === 14 && gx >= 13 && gx <= 18) return BRACK_SKIN;

    // EXPOSED MUSCULAR GREEN ARMS & HANDS (gx 7..10 & gx 21..24, gy 15..22)
    if (gy >= 15 && gy <= 22 && ((gx >= 7 && gx <= 10) || (gx >= 21 && gx <= 24))) {
      if (gx === 7 || gx === 24 || gy === 15 || gy === 22) return OUTLINE;
      return BRACK_SKIN; // Green muscular skin!
    }

    // Leather Vest Torso (gx 11..20, gy 15..23)
    if (gx >= 11 && gx <= 20 && gy >= 15 && gy <= 23) {
      if (gx === 11 || gx === 20 || gy === 15 || gy === 23) return OUTLINE;
      return BRACK_VEST;
    }

    // Crotch Split & 2 Separate Legs (gy 24..27)
    if ((gx === 15 || gx === 16) && gy >= 24 && gy <= 29) return OUTLINE;
    if (gy >= 24 && gy <= 27) {
      if ((gx >= 10 && gx <= 14) || (gx >= 17 && gx <= 21)) {
        if (gx === 10 || gx === 14 || gx === 17 || gx === 21) return OUTLINE;
        return BRACK_VEST;
      }
    }

    // Heavy Leather Boots (gy 27..29)
    if (gy >= 27 && gy <= 29) {
      if ((gx >= 9 && gx <= 14) || (gx >= 17 && gx <= 22)) {
        if (gx === 9 || gx === 14 || gx === 17 || gx === 22 || gy === 29) return OUTLINE;
        return BOOTS_DARK;
      }
    }
  }

  // =========================================================================
  // 5. EMBER (Dragonkin: Elongated snout, horns, tail, clawed hands, digitigrade legs)
  // =========================================================================
  if (charId === "ember") {
    // Curved Horns (gx 6..9 & gx 22..25, gy 2..6)
    if (gy >= 2 && gy <= 6 && ((gx >= 6 && gx <= 9) || (gx >= 22 && gx <= 25))) {
      if (gx === 6 || gx === 25 || gy === 2) return OUTLINE;
      return EMBER_BELLY;
    }

    // Head with Elongated Snout/Jaw forward (gx 8..23, gy 6..14)
    if (gy >= 6 && gy <= 14 && gx >= 8 && gx <= 23) {
      if (gx === 8 || gx === 23 || gy === 6 || gy === 14) return OUTLINE;
      // Yellow Dragon Eyes
      if ((gy === 9 || gy === 10) && (gx === 12 || gx === 19)) return EMBER_BELLY;
      if ((gy === 9 || gy === 10) && (gx === 13 || gx === 20)) return EYE_DARK;
      // Snout protrusion
      if (gy >= 11 && gy <= 13 && gx >= 11 && gx <= 20) return EMBER_SKIN;
      return EMBER_SKIN;
    }

    // Dragon Tail at back/side (gx 3..7, gy 20..26)
    if (gx >= 3 && gx <= 7 && gy >= 20 && gy <= 26) {
      if (gx === 3 || gy === 26) return OUTLINE;
      return EMBER_SKIN;
    }

    // Arms & Clawed Hands (gx 7..10 & gx 21..24, gy 15..22)
    if (gy >= 15 && gy <= 22 && ((gx >= 7 && gx <= 10) || (gx >= 21 && gx <= 24))) {
      if (gx === 7 || gx === 24 || gy === 15 || gy === 22) return OUTLINE;
      if (gy >= 21) return EMBER_BELLY; // Clawed hands
      return EMBER_SKIN;
    }

    // Torso with Yellow Scale Belly (gx 11..20, gy 15..23)
    if (gx >= 11 && gx <= 20 && gy >= 15 && gy <= 23) {
      if (gx === 11 || gx === 20 || gy === 15 || gy === 23) return OUTLINE;
      if (gx >= 14 && gx <= 17) return EMBER_BELLY; // Scaled belly
      return EMBER_OUTFIT;
    }

    // DIGITIGRADE LEGS (bent backwards at gy 24..27) & Clawed Feet (gy 27..29)
    if ((gx === 15 || gx === 16) && gy >= 24 && gy <= 29) return OUTLINE;
    if (gy >= 24 && gy <= 29) {
      if ((gx >= 9 && gx <= 14) || (gx >= 17 && gx <= 22)) {
        if (gx === 9 || gx === 14 || gx === 17 || gx === 22 || gy === 29) return OUTLINE;
        return EMBER_SKIN;
      }
    }
  }

  // =========================================================================
  // 6. MARROW (Skeleton: Skull, visible 3-4 ribcage lines, bone joints, lantern)
  // =========================================================================
  if (charId === "marrow") {
    // Lit Belt Lantern (gx 5..9, gy 19..25)
    if (gx >= 5 && gx <= 9 && gy >= 19 && gy <= 25) {
      if (gx === 5 || gx === 9 || gy === 19 || gy === 25) return OUTLINE;
      if (gy >= 21 && gy <= 23 && gx >= 6 && gx <= 8) return [255, 230, 80, 255]; // Yellow glow
      return MARROW_CLOAK;
    }

    // Skull Head (gx 10..21, gy 4..13)
    if (gx >= 10 && gx <= 21 && gy >= 4 && gy <= 13) {
      if (gx === 10 || gx === 21 || gy === 4 || gy === 13) return OUTLINE;
      if ((gy === 8 || gy === 9) && ((gx >= 12 && gx <= 14) || (gx >= 17 && gx <= 19))) return [15, 15, 20, 255]; // Eye sockets
      if (gy === 11 && (gx === 15 || gx === 16)) return [15, 15, 20, 255]; // Nose socket
      if (gy === 13 && gx >= 13 && gx <= 18 && gx % 2 === 1) return [15, 15, 20, 255]; // Teeth
      return MARROW_BONE;
    }

    // Spine Neck Gap (gy 14, gx 15..16)
    if (gy === 14 && gx >= 14 && gx <= 17) {
      if (gx === 14 || gx === 17) return OUTLINE;
      return MARROW_BONE;
    }

    // Bone Arm & Circle Joints (gx 8..10 & gx 21..23, gy 15..22)
    if (gy >= 15 && gy <= 22 && ((gx >= 8 && gx <= 10) || (gx >= 21 && gx <= 23))) {
      if (gx === 8 || gx === 23 || gy === 15 || gy === 22) return OUTLINE;
      if (gy === 15 || gy === 18 || gy === 22) return MARROW_BONE; // Joint circles!
      return [40, 38, 42, 255]; // Bone gap
    }

    // RIBCAGE: 3-4 horizontal bone ribs visible in chest cavity (gx 11..20, gy 15..22)
    if (gx >= 11 && gx <= 20 && gy >= 15 && gy <= 22) {
      if (gx === 11 || gx === 20 || gy === 15 || gy === 22) return OUTLINE;
      if (gy === 16 || gy === 18 || gy === 20) return MARROW_BONE; // 3 Horizontal Ribs!
      return [35, 30, 32, 255]; // Dark chest cavity
    }

    // Crotch Split & Two Bone Legs (gy 23..29)
    if ((gx === 15 || gx === 16) && gy >= 23 && gy <= 29) return OUTLINE;
    if (gy >= 23 && gy <= 29) {
      if ((gx >= 10 && gx <= 14) || (gx >= 17 && gx <= 21)) {
        if (gx === 10 || gx === 14 || gx === 17 || gx === 21 || gy === 29) return OUTLINE;
        if (gy === 25) return MARROW_BONE; // Knee joint circle
        return MARROW_BONE;
      }
    }
  }

  // =========================================================================
  // 7. SABLE (Hooded Shadow: Deep hood, purple eye glow, hands popping out)
  // =========================================================================
  if (charId === "sable") {
    // Deep Hood & Cloak (gx 8..23, gy 3..26)
    if (gx >= 8 && gx <= 23 && gy >= 3 && gy <= 26) {
      if (gx === 8 || gx === 23 || gy === 3 || gy === 26) return OUTLINE;

      // Pale Face Sliver inside hood (gx 12..19, gy 9..13)
      if (gy >= 9 && gy <= 13 && gx >= 12 && gx <= 19) {
        if (gy === 11 && (gx === 14 || gx === 17)) return SABLE_EYE; // Glowing purple eyes
        return SABLE_SKIN;
      }
      return SABLE_HOOD;
    }

    // HANDS POPPING OUT SLIGHTLY FROM CLOAK at gy 20..22 (gx 6..8 & gx 23..25)
    if (gy >= 20 && gy <= 22 && ((gx >= 6 && gx <= 8) || (gx >= 23 && gx <= 25))) {
      if (gx === 6 || gx === 25 || gy === 20 || gy === 22) return OUTLINE;
      return SABLE_SKIN; // Hands popping out!
    }

    // Crotch Split & Boots (gy 27..29)
    if ((gx === 15 || gx === 16) && gy >= 27 && gy <= 29) return OUTLINE;
    if (gy >= 27 && gy <= 29) {
      if ((gx >= 10 && gx <= 14) || (gx >= 17 && gx <= 21)) {
        if (gx === 10 || gx === 14 || gx === 17 || gx === 21 || gy === 29) return OUTLINE;
        return BOOTS_DARK;
      }
    }
  }

  // =========================================================================
  // 8. HALCYON (Centaur Ranger: Chibi human torso + Horse lower body with 4 LEGS & hooves)
  // =========================================================================
  if (charId === "halcyon") {
    // Ranger Bow on Back (gx 5..8, gy 6..18)
    if (gx >= 5 && gx <= 8 && gy >= 6 && gy <= 18) {
      if (gx === 5 || gy === 6 || gy === 18) return OUTLINE;
      return [180, 110, 40, 255]; // Wooden bow
    }

    // Human Head & Hair (gx 9..22, gy 3..12)
    if (gx >= 9 && gx <= 22 && gy >= 3 && gy <= 12) {
      if (gy === 3 || gx === 9 || gx === 22 || gy === 12) return OUTLINE;
      if (gy <= 6) return HALCYON_HAIR;
      if ((gy === 9 || gy === 10) && (gx === 13 || gx === 18)) return EYE_DARK;
      if ((gy === 9 || gy === 10) && (gx === 14 || gx === 19)) return EYE_SHINE;
      return HALCYON_HUMAN_SKIN;
    }

    // Neck Gap (gy 13)
    if (gy === 13 && gx >= 13 && gx <= 18) return HALCYON_HUMAN_SKIN;

    // Human Torso & Arms (gx 10..21, gy 14..18)
    if (gx >= 10 && gx <= 21 && gy >= 14 && gy <= 18) {
      if (gx === 10 || gx === 21 || gy === 14) return OUTLINE;
      if (gx <= 11 || gx >= 20) return HALCYON_HUMAN_SKIN; // Arms
      return HALCYON_VEST;
    }

    // HORSE LOWER BODY (gx 4..27, gy 18..24)
    if (gx >= 4 && gx <= 27 && gy >= 18 && gy <= 24) {
      if (gx === 4 || gx === 27 || gy === 18 || gy === 24) return OUTLINE;
      return HALCYON_HORSE;
    }

    // Horse Swishing Tail at Back (gx 1..4, gy 19..25)
    if (gx >= 1 && gx <= 4 && gy >= 19 && gy <= 25) {
      if (gx === 1 || gy === 25) return OUTLINE;
      return HALCYON_HAIR;
    }

    // 4 SEPARATE HORSE LEGS (Front L: 6..8, Front R: 11..13, Back L: 17..19, Back R: 22..24, gy 25..28)
    const isFrontLegL = gx >= 6 && gx <= 8;
    const isFrontLegR = gx >= 11 && gx <= 13;
    const isBackLegL = gx >= 17 && gx <= 19;
    const isBackLegR = gx >= 22 && gx <= 24;

    if (gy >= 25 && gy <= 29) {
      if (isFrontLegL || isFrontLegR || isBackLegL || isBackLegR) {
        // Outline surrounding each of the 4 legs
        if (
          gy === 29 ||
          (isFrontLegL && (gx === 6 || gx === 8)) ||
          (isFrontLegR && (gx === 11 || gx === 13)) ||
          (isBackLegL && (gx === 17 || gx === 19)) ||
          (isBackLegR && (gx === 22 || gx === 24))
        ) {
          return OUTLINE;
        }

        // Hooves at gy 28..29
        if (gy >= 28) return HALCYON_HOOF;
        return HALCYON_HORSE;
      }
    }
  }

  return CLEAR;
}

const characters = ['dawn', 'wren', 'thistle', 'brack', 'ember', 'marrow', 'sable', 'halcyon'];

const outputDir = path.join(process.cwd(), 'public', 'sprites');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Render high-res 256x256 single-pose pixel character with distinct anatomical features
characters.forEach((charKey) => {
  const pngBuffer = generatePNG(256, 256, (x, y) => {
    const gx = Math.floor(x / 8); // 0..31
    const gy = Math.floor(y / 8); // 0..31
    return renderCharacterGrid(charKey, gx, gy);
  });

  fs.writeFileSync(path.join(outputDir, `${charKey}.png`), pngBuffer);
  console.log(`Generated anatomically distinct 256x256 pixel character: ${charKey}.png`);
});

// Generate Theme 1: Wanderer's Path (Mystical Dark Forest Theme)
const wandererDir = path.join(process.cwd(), 'public', 'themes', 'wanderers-path');
if (!fs.existsSync(wandererDir)) {
  fs.mkdirSync(wandererDir, { recursive: true });
}

const wandererBuffer = generatePNG(320, 320, (x, y) => {
  const tileX = Math.floor(x / 32);
  const tileY = Math.floor(y / 32);
  const isEven = (tileX + tileY) % 2 === 0;

  // Outer Grid Line
  if (x % 32 === 0 || y % 32 === 0) {
    return [45, 40, 55, 255];
  }

  // Winding stone path decoration in background
  const isPath = (tileY === 1 || tileY === 2 || (tileX === 8 && tileY >= 2 && tileY <= 5) || (tileY === 5 && tileX >= 2 && tileX <= 8) || (tileX === 2 && tileY >= 5 && tileY <= 8));

  if (isPath) {
    return isEven ? [70, 65, 80, 255] : [60, 55, 70, 255];
  }

  return isEven ? [32, 28, 38, 255] : [38, 34, 45, 255];
});
fs.writeFileSync(path.join(wandererDir, 'board.png'), wandererBuffer);

// Generate Theme 2: Frozen Peaks (Ice Mountain Theme)
const frozenDir = path.join(process.cwd(), 'public', 'themes', 'frozen-peaks');
if (!fs.existsSync(frozenDir)) {
  fs.mkdirSync(frozenDir, { recursive: true });
}

const frozenBuffer = generatePNG(320, 320, (x, y) => {
  const tileX = Math.floor(x / 32);
  const tileY = Math.floor(y / 32);
  const isEven = (tileX + tileY) % 2 === 0;

  if (x % 32 === 0 || y % 32 === 0) {
    return [60, 100, 140, 255]; // Ice grid border
  }

  // Winding cracked ice path in background
  const isIcePath = (tileY === 8 || (tileX === 7 && tileY >= 4 && tileY <= 8) || (tileY === 4 && tileX >= 1 && tileX <= 7));

  if (isIcePath) {
    return isEven ? [210, 240, 255, 255] : [190, 225, 250, 255];
  }

  if (isEven) {
    return [160, 205, 235, 255]; // Light blue ice
  } else {
    return [130, 180, 215, 255]; // Deep frost blue
  }
});
fs.writeFileSync(path.join(frozenDir, 'board.png'), frozenBuffer);

console.log('Anatomically precise 256x256 Chibi Pixel Sprites generated successfully!');
