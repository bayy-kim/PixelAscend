"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

// Alphabet exclude ambiguous characters: 0, O, 1, I, L
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateRoomCode(length: number = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[idx];
  }
  return code;
}

export async function createRoom(themeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Validate theme existence
  const theme = await db.theme.findUnique({
    where: { id: themeId, isEnabled: true },
  });
  if (!theme) {
    return { error: "Tema tidak valid atau dinonaktifkan." };
  }

  let code = "";
  let isUnique = false;

  // Try generating room code until it's unique in database
  while (!isUnique) {
    code = generateRoomCode();
    const existing = await db.room.findUnique({
      where: { code },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { favoriteCharacterId: true },
    });

    let selectedCharId = user?.favoriteCharacterId || "dawn";

    // Verify chosen favorite character is enabled
    const validChar = await db.character.findUnique({
      where: { id: selectedCharId, isEnabled: true },
    });

    if (!validChar) {
      const fallbackChar = await db.character.findFirst({
        where: { isEnabled: true },
      });
      if (!fallbackChar) {
        return { error: "Tidak ada karakter aktif di katalog." };
      }
      selectedCharId = fallbackChar.id;
    }

    const room = await db.room.create({
      data: {
        code,
        themeId,
        hostUserId: session.user.id,
        status: "LOBBY",
        players: {
          create: {
            userId: session.user.id,
            characterId: selectedCharId,
            turnOrder: 0,
            position: 0,
            isReady: true, // Host is ready by default
            heldCards: [],
          },
        },
      },
    });

    return { success: true, code: room.code };
  } catch (err) {
    console.error(err);
    return { error: "Gagal membuat room. Silakan coba lagi." };
  }
}

export async function joinRoomByCode(code: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const room = await db.room.findUnique({
      where: { code: normalizedCode },
      include: {
        players: true,
      },
    });

    if (!room) {
      return { error: "Room tidak ditemukan." };
    }

    if (room.status !== "LOBBY") {
      return { error: "Permainan di room ini sudah dimulai atau dibatalkan." };
    }

    if (room.players.length >= 8) {
      return { error: "Room sudah penuh (maksimal 8 pemain)." };
    }

    // Check if player is already in room
    const existingPlayer = room.players.find((p: any) => p.userId === session.user.id);
    if (!existingPlayer) {
      // Pick favorite character if available, else pick first untaken character
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { favoriteCharacterId: true },
      });

      const takenCharIds = room.players.map((p: any) => p.characterId);
      let selectedCharId = user?.favoriteCharacterId || "dawn";

      if (takenCharIds.includes(selectedCharId)) {
        // Favorite is taken, pick first untaken character
        const availableChar = await db.character.findFirst({
          where: {
            isEnabled: true,
            id: { notIn: takenCharIds },
          },
        });
        if (!availableChar) {
          return { error: "Semua karakter di room ini sudah dipilih." };
        }
        selectedCharId = availableChar.id;
      }

      // Pre-register RoomPlayer in DB so join doesn't bounce
      await db.roomPlayer.create({
        data: {
          roomId: room.id,
          userId: session.user.id,
          characterId: selectedCharId,
          turnOrder: room.players.length,
          position: 0,
          isReady: false,
          heldCards: [],
        },
      });
    }

    return { success: true, code: room.code };
  } catch (err) {
    console.error(err);
    return { error: "Gagal bergabung ke room." };
  }
}
