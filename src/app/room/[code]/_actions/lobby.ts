"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher-server";
import { revalidatePath } from "next/cache";

export async function addCpuPlayer(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room || room.status !== "LOBBY") {
      return { error: "Lobby tidak aktif." };
    }

    if (room.hostUserId !== session.user.id) {
      return { error: "Hanya Host yang dapat menambah CPU / Computer." };
    }

    if (room.players.length >= 8) {
      return { error: "Room sudah penuh (maksimal 8 pemain)." };
    }

    // Generate unique CPU User ID and Name
    const cpuNumber = room.players.filter((p: any) => p.userId.startsWith("cpu_")).length + 1;
    const cpuUserId = `cpu_${Date.now()}_${cpuNumber}`;
    const cpuName = `CPU ${cpuNumber} (Computer)`;

    // Ensure CPU User exists in database
    await db.user.upsert({
      where: { id: cpuUserId },
      update: {},
      create: {
        id: cpuUserId,
        email: `${cpuUserId}@pixelascend.local`,
        name: cpuName,
        nickname: cpuName,
      },
    });

    // Find first available untaken character
    const takenCharIds = room.players.map((p: any) => p.characterId);
    const availableChar = await db.character.findFirst({
      where: {
        isEnabled: true,
        id: { notIn: takenCharIds.length ? takenCharIds : [""] },
      },
    });

    if (!availableChar) {
      return { error: "Semua karakter di room ini sudah dipilih." };
    }

    // Create RoomPlayer entry for CPU (ready by default)
    await db.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: cpuUserId,
        characterId: availableChar.id,
        turnOrder: room.players.length,
        position: 0,
        isReady: true,
        heldCards: [],
      },
    });

    // Notify other players
    try {
      await pusherServer.trigger(`presence-room-${roomCode}`, "player-joined", {
        userId: cpuUserId,
        name: cpuName,
        nickname: cpuName,
      });
    } catch (pusherErr) {
      console.warn("Pusher trigger warning:", pusherErr);
    }

    revalidatePath(`/room/${roomCode}`);
    return { success: true };
  } catch (err) {
    console.error("addCpuPlayer error:", err);
    return { error: "Gagal menambahkan CPU / Computer." };
  }
}

export async function joinLobby(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room) {
      return { error: "Room tidak ditemukan." };
    }

    if (room.status !== "LOBBY") {
      return { error: "Permainan sudah dimulai." };
    }

    // Check if player is already in room
    const existingPlayer = room.players.find((p: any) => p.userId === session.user.id);
    if (existingPlayer) {
      return { success: true };
    }

    if (room.players.length >= 8) {
      return { error: "Room penuh." };
    }

    // Find all characters currently taken in this room
    const takenCharIds = room.players.map((p: any) => p.characterId);

    // Pick first enabled character that is NOT taken yet
    const availableChar = await db.character.findFirst({
      where: {
        isEnabled: true,
        id: { notIn: takenCharIds.length ? takenCharIds : [""] },
      },
    });

    if (!availableChar) {
      return { error: "Semua karakter di room ini sudah dipilih." };
    }

    // Create RoomPlayer entry
    await db.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: session.user.id,
        characterId: availableChar.id,
        turnOrder: room.players.length,
        position: 0,
        isReady: false,
        heldCards: [],
      },
    });

    // Trigger Pusher event to notify others (safely catch any pusher broadcast error)
    try {
      await pusherServer.trigger(`presence-room-${roomCode}`, "player-joined", {
        userId: session.user.id,
        name: session.user.name,
        nickname: session.user.nickname,
        characterId: availableChar.id,
        cosmeticVariant: "default",
        avatarUrl: (session.user as any).avatarUrl || session.user.image,
      });
    } catch (pusherErr) {
      console.warn("Pusher trigger warning:", pusherErr);
    }

    revalidatePath(`/room/${roomCode}`);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal masuk lobby." };
  }
}

export async function kickPlayer(roomCode: string, targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room || room.status !== "LOBBY") {
      return { error: "Lobby tidak aktif." };
    }

    if (room.hostUserId !== session.user.id) {
      return { error: "Hanya Host yang dapat mengeluarkan pemain." };
    }

    if (targetUserId === session.user.id) {
      return { error: "Host tidak dapat mengeluarkan diri sendiri." };
    }

    await db.roomPlayer.deleteMany({
      where: {
        roomId: room.id,
        userId: targetUserId,
      },
    });

    // Notify other players
    try {
      await pusherServer.trigger(`presence-room-${roomCode}`, "player-left", {
        userId: targetUserId,
        kicked: true,
      });
    } catch (err) {
      console.warn("Pusher trigger error:", err);
    }

    revalidatePath(`/room/${roomCode}`);
    return { success: true };
  } catch (err) {
    console.error("kickPlayer error:", err);
    return { error: "Gagal mengeluarkan pemain." };
  }
}

export async function leaveLobby(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
    });

    if (!room) return;

    await db.roomPlayer.deleteMany({
      where: {
        roomId: room.id,
        userId: session.user.id,
      },
    });

    // Trigger Pusher event
    await pusherServer.trigger(`presence-room-${roomCode}`, "player-left", {
      userId: session.user.id,
    });

    revalidatePath(`/room/${roomCode}`);
  } catch (err) {
    console.error(err);
  }
}

export async function selectCharacterAndPalette(
  roomCode: string,
  characterId: string,
  cosmeticVariant: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room || room.status !== "LOBBY") {
      return { error: "Lobby tidak aktif." };
    }

    // Verify character is enabled
    const char = await db.character.findUnique({
      where: { id: characterId, isEnabled: true },
    });
    if (!char) {
      return { error: "Karakter tidak valid atau dinonaktifkan." };
    }

    // Verify character isn't already taken by another player in the same room
    const taken = room.players.some(
      (p: any) => p.characterId === characterId && p.userId !== session.user.id
    );
    if (taken) {
      return { error: "Karakter ini sudah dipilih pemain lain." };
    }

    // Update player character selection
    await db.roomPlayer.update({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: session.user.id,
        },
      },
      data: {
        characterId,
        cosmeticVariant,
      },
    });

    // Notify other players (safely catch any pusher broadcast error)
    try {
      await pusherServer.trigger(`presence-room-${roomCode}`, "player-picked-character", {
        userId: session.user.id,
        characterId,
        cosmeticVariant,
      });
    } catch (pusherErr) {
      console.warn("Pusher trigger warning:", pusherErr);
    }

    revalidatePath(`/room/${roomCode}`);
    return { success: true };
  } catch (err: any) {
    console.error("selectCharacterAndPalette error:", err);
    return { error: err?.message || "Gagal memilih karakter." };
  }
}

export async function toggleReady(roomCode: string, isReady: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });
    if (!room || room.status !== "LOBBY") {
      return { error: "Lobby tidak aktif." };
    }

    const existingPlayer = room.players.find((p: any) => p.userId === session.user.id);
    if (!existingPlayer) {
      const takenCharIds = room.players.map((p: any) => p.characterId);
      const availableChar = await db.character.findFirst({
        where: {
          isEnabled: true,
          id: { notIn: takenCharIds.length ? takenCharIds : [""] },
        },
      });

      await db.roomPlayer.create({
        data: {
          roomId: room.id,
          userId: session.user.id,
          characterId: availableChar?.id || "dawn",
          turnOrder: room.players.length,
          position: 0,
          isReady: isReady,
          heldCards: [],
        },
      });
    } else {
      await db.roomPlayer.update({
        where: { id: existingPlayer.id },
        data: { isReady },
      });
    }

    // Notify other players
    try {
      await pusherServer.trigger(`presence-room-${roomCode}`, "player-ready", {
        userId: session.user.id,
        isReady,
      });
    } catch (pusherErr) {
      console.warn("Pusher trigger warning:", pusherErr);
    }

    revalidatePath(`/room/${roomCode}`);
    return { success: true };
  } catch (err) {
    console.error("toggleReady error:", err);
    return { error: "Gagal memperbarui status ready." };
  }
}

export async function getRoomPlayers(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: {
        players: {
          include: {
            user: {
              select: {
                name: true,
                nickname: true,
                image: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!room) {
      return { error: "Room tidak ditemukan." };
    }

    return {
      success: true,
      players: room.players,
      status: room.status,
      hostUserId: room.hostUserId,
    };
  } catch (err) {
    console.error("getRoomPlayers error:", err);
    return { error: "Gagal mengambil data pemain." };
  }
}

export async function startGame(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: {
        players: true,
      },
    });

    if (!room) {
      return { error: "Room tidak ditemukan." };
    }

    if (room.hostUserId !== session.user.id) {
      return { error: "Hanya host yang bisa memulai permainan." };
    }

    if (room.status !== "LOBBY") {
      return { error: "Permainan sudah dimulai." };
    }

    // Constraints check: >= 2 players, all human non-host players ready (Host & CPU auto-ready)
    if (room.players.length < 2) {
      return { error: "Minimal dibutuhkan 2 pemain untuk memulai." };
    }

    const unreadyPlayer = room.players.find(
      (p: any) => !p.isReady && p.userId !== room.hostUserId && !p.userId.startsWith("cpu_")
    );
    if (unreadyPlayer) {
      return { error: "Semua pemain manusia harus bersiap (Ready) terlebih dahulu." };
    }

    // Shuffle turn order randomly
    const shuffledOrder = [...Array(room.players.length).keys()].sort(
      () => Math.random() - 0.5
    );

    for (let i = 0; i < room.players.length; i++) {
      await db.roomPlayer.update({
        where: { id: room.players[i].id },
        data: {
          turnOrder: shuffledOrder[i],
          position: 0,
        },
      });
    }

    // Update Room status to IN_PROGRESS
    await db.room.update({
      where: { id: room.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
        currentTurnIndex: 0,
      },
    });

    // Notify other players game has started
    try {
      await pusherServer.trigger(`presence-room-${roomCode}`, "game-started", {});
    } catch (pusherErr) {
      console.warn("Pusher trigger warning:", pusherErr);
    }

    revalidatePath(`/room/${roomCode}`);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal memulai permainan." };
  }
}
