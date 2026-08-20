import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // Seed Default Theme & Theme 2
  const defaultTheme = await prisma.theme.upsert({
    where: { id: "wanderers-path" },
    update: {},
    create: {
      id: "wanderers-path",
      name: "Wanderer's Path",
      description: "Chibi pixel-art dark forest path. Filled with mystery, vines, and ancient ladders.",
      boardArtUrl: "/themes/wanderers-path/board.png",
      isEnabled: true,
      isDefault: true,
    },
  });
  console.log(`Theme seeded: ${defaultTheme.name}`);

  const frozenTheme = await prisma.theme.upsert({
    where: { id: "frozen-peaks" },
    update: {},
    create: {
      id: "frozen-peaks",
      name: "Frozen Peaks",
      description: "Frosty ice mountain peaks. Glacial slides and crystal scaling ladders.",
      boardArtUrl: "/themes/frozen-peaks/board.png",
      isEnabled: true,
      isDefault: false,
    },
  });
  console.log(`Theme seeded: ${frozenTheme.name}`);

  // Seed 8 Characters
  const characters = [
    {
      id: "dawn",
      name: "Dawn — Ksatria Manusia",
      archetype: "Manusia",
      abilityName: "Guardian's Ward",
      abilityDesc: "Memblokir penuh 1 efek negatif hazard (Shadow Vine) selama permainan (1x per match).",
      role: "Defense",
      spriteBaseUrl: "/sprites/dawn.png",
      isEnabled: true,
    },
    {
      id: "wren",
      name: "Wren — Mistikus Elf",
      archetype: "Elf",
      abilityName: "Foresight",
      abilityDesc: "Reroll dadu setelah melihat hasil jika kurang memuaskan (1x per match).",
      role: "Luck",
      spriteBaseUrl: "/sprites/wren.png",
      isEnabled: true,
    },
    {
      id: "thistle",
      name: "Thistle — Penjaga Dwarf",
      archetype: "Dwarf",
      abilityName: "Stone Stance",
      abilityDesc: "Efek penalti dari hazard (Shadow Vine) hanya berdampak setengah dari jarak aslinya (Pasif otomatis).",
      role: "Defense",
      spriteBaseUrl: "/sprites/thistle.png",
      isEnabled: true,
    },
    {
      id: "brack",
      name: "Brack — Petarung Orc",
      archetype: "Orc",
      abilityName: "Retaliation",
      abilityDesc: "Kartu jahat dari pemain lain yang menyasar dirimu akan dipantulkan kembali ke pengirim (Pasif otomatis).",
      role: "Offense",
      spriteBaseUrl: "/sprites/brack.png",
      isEnabled: true,
    },
    {
      id: "ember",
      name: "Ember — Prajurit Dragonkin",
      archetype: "Dragonkin",
      abilityName: "Scorch Rush",
      abilityDesc: "Setiap lemparan dadu mendapatkan +1 tile, namun penalti dari hazard (Shadow Vine) bernilai 2x lipat (Pasif permanen).",
      role: "Risk/Reward",
      spriteBaseUrl: "/sprites/ember.png",
      isEnabled: true,
    },
    {
      id: "marrow",
      name: "Marrow — Pengembara Skeleton",
      archetype: "Skeleton",
      abilityName: "Second Wind",
      abilityDesc: "Jika terkena hazard yang mengirimmu kembali ke tile 1, kamu hanya akan turun ke checkpoint 10 tile terdekat (1x per match).",
      role: "Comeback",
      spriteBaseUrl: "/sprites/marrow.png",
      isEnabled: true,
    },
    {
      id: "sable",
      name: "Sable — Bayangan Berkerudung",
      archetype: "Shadow Rogue",
      abilityName: "Vanish",
      abilityDesc: "Menjadi kebal dari semua kartu serangan atau efek negatif pemain lain selama 1 ronde (1x per match).",
      role: "Evasion",
      spriteBaseUrl: "/sprites/sable.png",
      isEnabled: true,
    },
    {
      id: "halcyon",
      name: "Halcyon — Ranger Centaur",
      archetype: "Centaur",
      abilityName: "Swift Stride",
      abilityDesc: "Setelah mendarat di tile normal, boleh memilih untuk melangkah 1-3 tile tambahan (1x per match).",
      role: "Mobility",
      spriteBaseUrl: "/sprites/halcyon.png",
      isEnabled: true,
    },
  ];

  for (const char of characters) {
    const upserted = await prisma.character.upsert({
      where: { id: char.id },
      update: {
        name: char.name,
        archetype: char.archetype,
        abilityName: char.abilityName,
        abilityDesc: char.abilityDesc,
        role: char.role,
        spriteBaseUrl: char.spriteBaseUrl,
        isEnabled: char.isEnabled,
      },
      create: char,
    });
    console.log(`Character seeded: ${upserted.name}`);
  }

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
