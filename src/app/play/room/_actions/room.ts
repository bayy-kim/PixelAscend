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
    const room = await db.room.create({
      data: {
        code,
        themeId,
        hostUserId: session.user.id,
        status: "LOBBY",
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

    return { success: true, code: room.code };
  } catch (err) {
    console.error(err);
    return { error: "Gagal bergabung ke room." };
  }
}
