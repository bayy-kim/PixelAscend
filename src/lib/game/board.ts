export interface TileEffect {
  type: "hazard" | "boost" | "event" | "powerup";
  name: string;
  description: string;
  targetTile?: number; // for hazard / boost
  magnitude?: number;   // for event movement (e.g. forward 3, backward 2)
  cardId?: string;      // for powerups (e.g. blink, aegis, mirror-ward, swap)
}

export interface BoardLayout {
  [tileIndex: number]: TileEffect;
}

// Boustrophedon layout helper to compute board coordinates (10x10 grid)
// Row 0 is bottom (tiles 1-10 left to right)
// Row 1 is next row up (tiles 11-20 right to left), etc.
export function getTileCoordinates(tileNumber: number): { x: number; y: number } {
  if (tileNumber < 1) tileNumber = 1;
  if (tileNumber > 100) tileNumber = 100;

  const index = tileNumber - 1;
  const row = Math.floor(index / 10);
  const col = index % 10;
  
  // Left to right on even rows, right to left on odd rows
  const x = row % 2 === 0 ? col : 9 - col;
  const y = 9 - row; // 0 is top row, 9 is bottom row

  return { x, y };
}

// Static layout design to balance gameplay
export const BOARD_LAYOUT: BoardLayout = {
  // Boost tiles (Ancient Ladder) - sends player up
  4: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 14", targetTile: 14 },
  9: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 31", targetTile: 31 },
  21: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 42", targetTile: 42 },
  28: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 84", targetTile: 84 },
  36: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 44", targetTile: 44 },
  51: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 67", targetTile: 67 },
  71: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 91", targetTile: 91 },
  80: { type: "boost", name: "Ancient Ladder", description: "Naik tangga kuno ke tile 100", targetTile: 100 },

  // Hazard tiles (Shadow Vine) - pulls player down
  17: { type: "hazard", name: "Shadow Vine", description: "Terjerat akar bayangan turun ke tile 7", targetTile: 7 },
  54: { type: "hazard", name: "Shadow Vine", description: "Terjerat akar bayangan turun ke tile 34", targetTile: 34 },
  62: { type: "hazard", name: "Shadow Vine", description: "Terjerat akar bayangan turun ke tile 19", targetTile: 19 },
  64: { type: "hazard", name: "Shadow Vine", description: "Terjerat akar bayangan turun ke tile 60", targetTile: 60 },
  87: { type: "hazard", name: "Shadow Vine", description: "Terjerat akar bayangan turun ke tile 24", targetTile: 24 },
  93: { type: "hazard", name: "Shadow Vine", description: "Terjerat akar bayangan turun ke tile 73", targetTile: 73 },
  95: { type: "hazard", name: "Shadow Vine", description: "Terjerat akar bayangan turun ke tile 75", targetTile: 75 },
  98: { type: "hazard", name: "Giant Shadow Vine", description: "Terjerat Akar Bayangan Utama jatuh ke Checkpoint Tengah (Tile 48)!", targetTile: 48 },

  // Event tiles - immediate movement / status effects
  12: { type: "event", name: "Wisp's Blessing", description: "Maju 3 tile tambahan", magnitude: 3 },
  25: { type: "event", name: "Rockslide", description: "Mundur 2 tile", magnitude: -2 },
  45: { type: "event", name: "Creeping Fog", description: "Skip giliran berikutnya", magnitude: 0 },
  58: { type: "event", name: "Swiftness Brew", description: "Dadu ganda di giliran berikutnya", magnitude: 0 },
  68: { type: "event", name: "Wisp's Blessing", description: "Maju 3 tile tambahan", magnitude: 3 },
  85: { type: "event", name: "Rockslide", description: "Mundur 2 tile", magnitude: -2 },

  // Powerup tiles (Ancient Chest) - draw Action Cards
  15: { type: "powerup", name: "Ancient Chest", description: "Dapatkan 1 Action Card acak", cardId: "random" },
  30: { type: "powerup", name: "Ancient Chest", description: "Dapatkan 1 Action Card acak", cardId: "random" },
  48: { type: "powerup", name: "Ancient Chest", description: "Dapatkan 1 Action Card acak", cardId: "random" },
  60: { type: "powerup", name: "Ancient Chest", description: "Dapatkan 1 Action Card acak", cardId: "random" },
  75: { type: "powerup", name: "Ancient Chest", description: "Dapatkan 1 Action Card acak", cardId: "random" },
  88: { type: "powerup", name: "Ancient Chest", description: "Dapatkan 1 Action Card acak", cardId: "random" },
};

// Available Action Cards pool
export const ACTION_CARDS = [
  { id: "blink", name: "Blink", description: "Teleport maju 5 tile langsung." },
  { id: "aegis", name: "Aegis", description: "Blokir 1 efek hazard (Shadow Vine) berikutnya." },
  { id: "mirror-ward", name: "Mirror Ward", description: "Pantulkan 1 kartu jahat berikutnya yang menyasar dirimu." },
  { id: "swap", name: "Swap", description: "Tukar posisi dengan pemain pilihan." },
];
