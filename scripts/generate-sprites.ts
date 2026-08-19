import fs from 'fs';
import path from 'path';

// High-Detail 2D Pixel Chibi Generator (32x32 per frame, 96x128 total per sheet)
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

interface CharStyle {
  skin: [number, number, number];
  hair: [number, number, number];
  outfit: [number, number, number];
  accent: [number, number, number];
  eye: [number, number, number];
  type: "human" | "elf" | "dwarf" | "orc" | "dragon" | "skeleton" | "hooded" | "centaur";
}

const CHAR_STYLES: Record<string, CharStyle> = {
  dawn: { skin: [235, 190, 150], hair: [115, 65, 30], outfit: [70, 110, 180], accent: [230, 190, 60], eye: [25, 25, 30], type: "human" },
  wren: { skin: [240, 215, 190], hair: [210, 205, 230], outfit: [120, 60, 170], accent: [170, 130, 230], eye: [80, 170, 150], type: "elf" },
  thistle: { skin: [215, 170, 130], hair: [180, 180, 190], outfit: [130, 85, 45], accent: [180, 110, 40], eye: [30, 30, 35], type: "dwarf" },
  brack: { skin: [95, 165, 75], hair: [40, 55, 35], outfit: [90, 65, 45], accent: [190, 180, 140], eye: [220, 50, 40], type: "orc" },
  ember: { skin: [210, 60, 45], hair: [160, 40, 30], outfit: [140, 45, 35], accent: [245, 175, 45], eye: [250, 210, 50], type: "dragon" },
  marrow: { skin: [230, 230, 220], hair: [60, 55, 50], outfit: [85, 75, 65], accent: [160, 160, 150], eye: [15, 15, 20], type: "skeleton" },
  sable: { skin: [220, 185, 150], hair: [30, 25, 35], outfit: [25, 22, 30], accent: [160, 80, 220], eye: [190, 120, 250], type: "hooded" },
  halcyon: { skin: [220, 175, 135], hair: [95, 60, 35], outfit: [115, 80, 45], accent: [55, 120, 80], eye: [40, 35, 30], type: "centaur" }
};

const characters = ['dawn', 'wren', 'thistle', 'brack', 'ember', 'marrow', 'sable', 'halcyon'];

const outputDir = path.join(process.cwd(), 'public', 'sprites');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

characters.forEach((char) => {
  const s = CHAR_STYLES[char];

  const pngBuffer = generatePNG(96, 128, (x, y) => {
    const col = Math.floor(x / 32); // 0, 1, 2
    const row = Math.floor(y / 32); // 0: Down, 1: Left, 2: Right, 3: Up
    const px = x % 32;
    const py = y % 32;

    const OUTLINE: [number, number, number, number] = [20, 18, 26, 255];
    const SHADOW: [number, number, number, number] = [0, 0, 0, 80];

    // Feet shadow ellipse (py = 28..30, px = 10..21)
    if (py >= 28 && py <= 30 && px >= 10 && px <= 21 && s.type !== "centaur") {
      if ((py === 29 && px >= 11 && px <= 20) || (py === 28 && px >= 13 && px <= 18)) {
        return SHADOW;
      }
    }

    // Centaur Horse lower body (py 18..28)
    if (s.type === "centaur" && py >= 18 && py <= 28) {
      if (px >= 6 && px <= 25 && py <= 27) {
        if (px === 6 || px === 25 || py === 18 || py === 27) return OUTLINE;
        // Horse body color
        return [130, 85, 45, 255];
      }
    }

    // Skeleton custom skull
    if (s.type === "skeleton") {
      const isSkull = (px >= 10 && px <= 21 && py >= 5 && py <= 15);
      if (isSkull) {
        if (px === 10 || px === 21 || py === 5 || py === 15) return OUTLINE;
        // Eye sockets
        if ((py === 9 || py === 10) && (px === 13 || px === 14 || px === 17 || px === 18)) {
          return [20, 20, 25, 255];
        }
        // Nose gap
        if (py === 12 && (px === 15 || px === 16)) return [20, 20, 25, 255];
        return [230, 230, 220, 255];
      }
      // Ribs & Bones
      if (py >= 16 && py <= 27 && px >= 11 && px <= 20) {
        if (px === 11 || px === 20 || py === 16 || py === 27) return OUTLINE;
        if (py % 2 === 0) return [200, 200, 190, 255];
        return [40, 38, 42, 255];
      }
      return [0, 0, 0, 0];
    }

    // Head definition (px: 9..22, py: 4..16)
    const isHead = (px >= 9 && px <= 22 && py >= 4 && py <= 16);
    // Body definition (px: 10..21, py: 17..27)
    const isBody = (px >= 10 && px <= 21 && py >= 17 && py <= 27);

    if (!isHead && !isBody) {
      return [0, 0, 0, 0];
    }

    // Black 1px outline
    if (
      px === 9 || px === 22 || py === 4 || py === 16 ||
      (py >= 17 && (px === 10 || px === 21 || py === 27))
    ) {
      return OUTLINE;
    }

    // Hair Top (py 4..8)
    if (py >= 4 && py <= 8 && s.type !== "hooded") {
      return [...s.hair, 255];
    }

    // Eyes (row 0: Front, row 1/2: Side)
    if (row === 0 && (py === 10 || py === 11)) {
      if (px === 13 || px === 18) return [...s.eye, 255];
      if (px === 14 || px === 19) return [255, 255, 255, 255]; // Eye shine highlight
    } else if ((row === 1 || row === 2) && (py === 10 || py === 11)) {
      const eyeX = row === 1 ? 12 : 19;
      if (px === eyeX) return [...s.eye, 255];
    }

    // Elf ears (px 7..8 & 23..24)
    if (s.type === "elf" && (py === 10 || py === 11)) {
      if (px === 8 || px === 23) return [...s.skin, 255];
    }

    // Dragon Horns
    if (s.type === "dragon" && py <= 6) {
      if (px === 10 || px === 21) return [...s.accent, 255];
    }

    // Orc Tusks
    if (s.type === "orc" && py === 13 && (px === 13 || px === 18)) {
      return [240, 240, 230, 255];
    }

    // Hooded cloak (Sable)
    if (s.type === "hooded" && py <= 15) {
      if (py >= 9 && py <= 13 && px >= 12 && px <= 19) {
        return [...s.skin, 255]; // Pale face sliver
      }
      return [...s.outfit, 255];
    }

    // Head Face Fill
    if (py <= 16) {
      return [...s.skin, 255];
    }

    // Body Outfit & Armor Details
    if (py >= 17 && py <= 24) {
      // Armor / Collar detail
      if (py === 17 || py === 18) return [...s.accent, 255];
      return [...s.outfit, 255];
    }

    // Legs walk bounce (col 1 & 2)
    const legOffset = (col === 1 ? -1 : col === 2 ? 1 : 0);
    if (py >= 25 && py <= 26) {
      const legLeft = px >= 11 + legOffset && px <= 14 + legOffset;
      const legRight = px >= 17 - legOffset && px <= 20 - legOffset;
      if (legLeft || legRight) {
        return [...s.hair, 255]; // Boots / trousers color
      }
    }

    return [...s.outfit, 255];
  });

  fs.writeFileSync(path.join(outputDir, `${char}.png`), pngBuffer);
  console.log(`Generated high-detail sprite: ${char}.png`);
});

console.log('High-detail 2D Chibi Pixel Sprites generated successfully!');
