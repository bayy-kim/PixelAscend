import fs from 'fs';
import path from 'path';

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

const CHAR_COLORS: Record<string, { body: [number, number, number], outfit: [number, number, number], detail: [number, number, number] }> = {
  dawn: { body: [220, 180, 140], outfit: [60, 120, 210], detail: [240, 200, 80] },
  wren: { body: [235, 210, 185], outfit: [140, 80, 190], detail: [200, 160, 255] },
  thistle: { body: [210, 165, 125], outfit: [140, 90, 50], detail: [180, 180, 190] },
  brack: { body: [90, 160, 70], outfit: [100, 70, 45], detail: [200, 190, 140] },
  ember: { body: [210, 70, 50], outfit: [150, 40, 30], detail: [240, 180, 50] },
  marrow: { body: [225, 225, 215], outfit: [70, 65, 60], detail: [180, 180, 170] },
  sable: { body: [210, 175, 140], outfit: [30, 28, 35], detail: [80, 75, 95] },
  halcyon: { body: [215, 170, 130], outfit: [120, 80, 45], detail: [85, 55, 30] }
};

const characters = ['dawn', 'wren', 'thistle', 'brack', 'ember', 'marrow', 'sable', 'halcyon'];

const outputDir = path.join(process.cwd(), 'public', 'sprites');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

characters.forEach((char) => {
  const palette = CHAR_COLORS[char];
  const pngBuffer = generatePNG(96, 128, (x, y) => {
    const col = Math.floor(x / 32); // 0, 1, 2 (walk frame)
    const row = Math.floor(y / 32); // 0: Down, 1: Left, 2: Right, 3: Up
    const px = x % 32;
    const py = y % 32;

    const isHead = (px >= 10 && px <= 21 && py >= 4 && py <= 15);
    const isBody = (px >= 8 && px <= 23 && py >= 16 && py <= 27);
    const legOffset = (col === 1 ? -1 : col === 2 ? 1 : 0);

    if (!isHead && !isBody) {
      return [0, 0, 0, 0];
    }

    if (px === 10 || px === 21 || py === 4 || py === 15 || px === 8 || px === 23 || py === 16 || py === 27) {
      return [20, 18, 24, 255];
    }

    if (row === 0 && (py === 9 || py === 10) && (px === 13 || px === 18)) {
      return [20, 18, 24, 255];
    }

    if (py <= 14) {
      return [...palette.body, 255];
    }

    if (py >= 24 && ((px >= 10 && px <= 13) || (px >= 18 && px <= 21))) {
      const legX = px + legOffset;
      if (legX >= 9 && legX <= 22) {
        return [...palette.detail, 255];
      }
    }

    return [...palette.outfit, 255];
  });

  fs.writeFileSync(path.join(outputDir, `${char}.png`), pngBuffer);
  console.log(`Generated sprite: ${char}.png`);
});

const boardDir = path.join(process.cwd(), 'public', 'themes', 'wanderers-path');
if (!fs.existsSync(boardDir)) {
  fs.mkdirSync(boardDir, { recursive: true });
}

const boardBuffer = generatePNG(320, 320, (x, y) => {
  const tileX = Math.floor(x / 32);
  const tileY = Math.floor(y / 32);
  const isEven = (tileX + tileY) % 2 === 0;

  if (x % 32 === 0 || y % 32 === 0) {
    return [40, 35, 48, 255];
  }

  if (isEven) {
    return [35, 33, 41, 255];
  } else {
    return [45, 42, 53, 255];
  }
});
fs.writeFileSync(path.join(boardDir, 'board.png'), boardBuffer);
console.log('Generated board.png successfully');
