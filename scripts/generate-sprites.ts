import fs from 'fs';
import path from 'path';

// High-Detail Single-Pose 2D Pixel Chibi Generator (256x256 per character PNG)
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

interface CharRenderSpec {
  skin: [number, number, number];
  hair: [number, number, number];
  outfit: [number, number, number];
  accent: [number, number, number];
  eye: [number, number, number];
  type: "dawn" | "wren" | "thistle" | "brack" | "ember" | "marrow" | "sable" | "halcyon";
}

const SPECS: Record<string, CharRenderSpec> = {
  dawn: { skin: [235, 190, 150], hair: [115, 65, 30], outfit: [70, 110, 180], accent: [230, 190, 60], eye: [25, 25, 30], type: "dawn" },
  wren: { skin: [240, 215, 190], hair: [210, 205, 230], outfit: [120, 60, 170], accent: [170, 130, 230], eye: [80, 170, 150], type: "wren" },
  thistle: { skin: [215, 170, 130], hair: [180, 180, 190], outfit: [130, 85, 45], accent: [180, 110, 40], eye: [30, 30, 35], type: "thistle" },
  brack: { skin: [95, 165, 75], hair: [40, 55, 35], outfit: [90, 65, 45], accent: [190, 180, 140], eye: [220, 50, 40], type: "brack" },
  ember: { skin: [210, 60, 45], hair: [160, 40, 30], outfit: [140, 45, 35], accent: [245, 175, 45], eye: [250, 210, 50], type: "ember" },
  marrow: { skin: [230, 230, 220], hair: [60, 55, 50], outfit: [85, 75, 65], accent: [160, 160, 150], eye: [15, 15, 20], type: "marrow" },
  sable: { skin: [220, 185, 150], hair: [30, 25, 35], outfit: [25, 22, 30], accent: [160, 80, 220], eye: [190, 120, 250], type: "sable" },
  halcyon: { skin: [220, 175, 135], hair: [95, 60, 35], outfit: [115, 80, 45], accent: [55, 120, 80], eye: [40, 35, 30], type: "halcyon" }
};

const outputDir = path.join(process.cwd(), 'public', 'sprites');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Render high-res 256x256 single-pose pixel character with distinct archetype features
Object.keys(SPECS).forEach((charKey) => {
  const spec = SPECS[charKey];
  
  // 256x256 image with 8x8 pixel blocks (32x32 pixel art grid scaled up crisp 8x)
  const pngBuffer = generatePNG(256, 256, (x, y) => {
    const gx = Math.floor(x / 8); // 0..31
    const gy = Math.floor(y / 8); // 0..31

    const OUTLINE: [number, number, number, number] = [20, 18, 26, 255];
    const SHADOW: [number, number, number, number] = [0, 0, 0, 90];
    const CAPE_COLOR: [number, number, number, number] = [40, 70, 140, 255];
    const SHIELD_GOLD: [number, number, number, number] = [230, 180, 40, 255];

    // Feet Ambient Drop Shadow
    if (gy >= 27 && gy <= 29 && gx >= 8 && gx <= 23 && spec.type !== "halcyon") {
      if ((gy === 28 && gx >= 9 && gx <= 22) || (gy === 27 && gx >= 11 && gx <= 20)) {
        return SHADOW;
      }
    }

    // --- DAWN (Human Knight: Plate armor, blue cape, sun shield) ---
    if (spec.type === "dawn") {
      // Sun Shield on left arm (gx 4..8, gy 15..23)
      if (gx >= 4 && gx <= 8 && gy >= 15 && gy <= 23) {
        if (gx === 4 || gx === 8 || gy === 15 || gy === 23) return OUTLINE;
        if (gx === 6 && gy === 19) return [255, 230, 100, 255]; // Sun emblem center
        return SHIELD_GOLD;
      }
      // Blue Cape on shoulders (gx 9..22, gy 16..25)
      if (gx >= 8 && gx <= 23 && gy >= 16 && gy <= 25) {
        if (gx === 8 || gx === 23) return OUTLINE;
        if (gx <= 10 || gx >= 21) return CAPE_COLOR;
      }
    }

    // --- WREN (Elf Mystic: Long silver hair, purple rune robe, staff) ---
    if (spec.type === "wren") {
      // Magic Staff on right hand (gx 23..25, gy 6..27)
      if (gx >= 23 && gx <= 25 && gy >= 6 && gy <= 27) {
        if (gy <= 9 && gx === 24) return [190, 150, 255, 255]; // Glowing crystal top
        if (gx === 24) return [110, 70, 40, 255];
      }
      // Long hair flowing down sides (gx 7..10 & 21..24, gy 8..20)
      if ((gx >= 7 && gx <= 9 || gx >= 22 && gx <= 24) && gy >= 8 && gy <= 20) {
        return [...spec.hair, 255];
      }
    }

    // --- THISTLE (Dwarf Guardian: Braided grey beard, tower shield, heavy iron plate) ---
    if (spec.type === "thistle") {
      // Wide Braided Beard (gx 9..22, gy 13..21)
      if (gx >= 9 && gx <= 22 && gy >= 13 && gy <= 21) {
        if (gx === 9 || gx === 22 || gy === 21) return OUTLINE;
        return [200, 200, 210, 255];
      }
    }

    // --- BRACK (Orc Fighter: Green skin, sleeveless leather fur, tusks, shoulder club) ---
    if (spec.type === "brack") {
      // Large Stone Club on shoulder (gx 21..26, gy 5..16)
      if (gx >= 21 && gx <= 26 && gy >= 5 && gy <= 16) {
        if (gy <= 9) return [100, 95, 90, 255]; // Stone head
        return [120, 80, 40, 255]; // Handle
      }
    }

    // --- EMBER (Dragonkin: Red scales, horns, dragon tail) ---
    if (spec.type === "ember") {
      // Curved Dragon Horns (gx 7..10 & 21..24, gy 3..7)
      if ((gx >= 7 && gx <= 10 && gy >= 3 && gy <= 7) || (gx >= 21 && gx <= 24 && gy >= 3 && gy <= 7)) {
        if (gy === 3 || gx === 7 || gx === 24) return OUTLINE;
        return [...spec.accent, 255];
      }
      // Dragon Tail (gx 4..8, gy 22..27)
      if (gx >= 3 && gx <= 7 && gy >= 22 && gy <= 27) {
        return [...spec.skin, 255];
      }
    }

    // --- MARROW (Skeleton: Bone skull, lit belt lantern, tattered cloak) ---
    if (spec.type === "marrow") {
      // Lit Lantern hanging from waist (gx 6..9, gy 20..25)
      if (gx >= 6 && gx <= 9 && gy >= 20 && gy <= 25) {
        if (gy >= 22 && gy <= 24 && gx >= 7 && gx <= 8) return [255, 220, 90, 255]; // Lit yellow glow
        return [60, 50, 45, 255];
      }
      // Hollow Skull Head (gx 9..22, gy 4..15)
      if (gx >= 9 && gx <= 22 && gy >= 4 && gy <= 15) {
        if (gx === 9 || gx === 22 || gy === 4 || gy === 15) return OUTLINE;
        if ((gy === 9 || gy === 10) && ((gx >= 12 && gx <= 14) || (gx >= 17 && gx <= 19))) {
          return [15, 15, 20, 255]; // Eye sockets
        }
        if (gy === 12 && (gx === 15 || gx === 16)) return [15, 15, 20, 255]; // Nose hole
        if (gy === 14 && gx >= 13 && gx <= 18 && gx % 2 === 1) return [15, 15, 20, 255]; // Teeth
        return [235, 235, 225, 255];
      }
    }

    // --- SABLE (Cloaked Shadow: Deep black hood, glowing purple eye sliver) ---
    if (spec.type === "sable") {
      if (gy >= 4 && gy <= 27 && gx >= 8 && gx <= 23) {
        if (gx === 8 || gx === 23 || gy === 4 || gy === 27) return OUTLINE;
        // Face sliver deep inside hood
        if (gy >= 10 && gy <= 13 && gx >= 12 && gx <= 19) {
          if (gy === 11 && (gx === 14 || gx === 17)) return [...spec.eye, 255]; // Purple eye glow
          return [35, 30, 40, 255];
        }
        return [...spec.outfit, 255];
      }
    }

    // --- HALCYON (Centaur Ranger: Horse lower body, bow on back) ---
    if (spec.type === "halcyon") {
      // Horse lower body (gx 4..27, gy 18..28)
      if (gx >= 4 && gx <= 27 && gy >= 18 && gy <= 28) {
        if (gx === 4 || gx === 27 || gy === 18 || gy === 28) return OUTLINE;
        if (gy >= 25 && (gx <= 8 || (gx >= 12 && gx <= 15) || (gx >= 18 && gx <= 20) || gx >= 24)) {
          return [40, 25, 15, 255]; // Hooves
        }
        return [120, 75, 40, 255]; // Chestnut horse body
      }
    }

    // General Head Structure (gx: 9..22, gy: 4..15)
    const isHead = (gx >= 9 && gx <= 22 && gy >= 4 && gy <= 15);
    // General Upper Torso Structure (gx: 10..21, gy: 16..27)
    const isBody = (gx >= 10 && gx <= 21 && gy >= 16 && gy <= 27);

    if (!isHead && !isBody) {
      return [0, 0, 0, 0];
    }

    // 1px Outer Black Pixel Outline
    if (
      gx === 9 || gx === 22 || gy === 4 || gy === 15 ||
      (gy >= 16 && (gx === 10 || gx === 21 || gy === 27))
    ) {
      return OUTLINE;
    }

    // Hair Top (gy 4..8)
    if (gy >= 4 && gy <= 8) {
      return [...spec.hair, 255];
    }

    // Expressive Eyes with Shine
    if (gy === 10 || gy === 11) {
      if (gx === 13 || gx === 18) return [...spec.eye, 255];
      if (gx === 14 || gx === 19) return [255, 255, 255, 255]; // Eye shine
    }

    // Face Fill
    if (gy <= 15) {
      return [...spec.skin, 255];
    }

    // Torso Armor & Outfit Fill
    if (gy >= 16 && gy <= 24) {
      if (gy === 16 || gy === 17) return [...spec.accent, 255]; // Collar / Shoulder armor
      return [...spec.outfit, 255];
    }

    // Trousers & Boots
    return [...spec.hair, 255];
  });

  fs.writeFileSync(path.join(outputDir, `${charKey}.png`), pngBuffer);
  console.log(`Generated high-resolution 256x256 single-pose character: ${charKey}.png`);
});

console.log('High-resolution 256x256 Single-Pose Character Sprites generated successfully!');
