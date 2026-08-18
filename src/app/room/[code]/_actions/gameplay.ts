"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher-server";
import { resolveTurn } from "@/lib/game/engine";
import { PlayerState } from "@/lib/game/abilities";
import { revalidatePath } from "next/cache";

export async function sendEmote(roomCode: string, emoteSymbol: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room) return { error: "Room tidak ditemukan." };

  const player = room.players.find((p: any) => p.userId === session.user.id);
  if (!player) return { error: "Pemain tidak terdaftar." };

  await pusherServer.trigger(`presence-room-${roomCode}`, "player-emote", {
    userId: session.user.id,
    characterId: player.characterId,
    emote: emoteSymbol,
  });

  return { success: true };
}

export async function executeActionCard(
  roomCode: string,
  cardId: string,
  targetUserId?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room || room.status !== "IN_PROGRESS") {
    return { error: "Game tidak sedang berlangsung." };
  }

  const activePlayer = room.players.find((p: any) => p.userId === session.user.id);
  if (!activePlayer) return { error: "Pemain tidak ditemukan." };

  const heldCards = Array.isArray(activePlayer.heldCards)
    ? (activePlayer.heldCards as string[])
    : [];

  if (!heldCards.includes(cardId)) {
    return { error: "Kamu tidak memiliki kartu ini." };
  }

  // Remove card from player hand
  const updatedCards = heldCards.filter((c) => c !== cardId);
  let announcementMessage = "";

  if (cardId === "blink") {
    const newPos = Math.min(100, activePlayer.position + 5);
    await db.roomPlayer.update({
      where: { id: activePlayer.id },
      data: { position: newPos, heldCards: updatedCards },
    });
    announcementMessage = `${session.user.name} menggunakan Blink! Teleport maju +5 tile.`;
  } else if (cardId === "swap" && targetUserId) {
    const targetPlayer = room.players.find((p: any) => p.userId === targetUserId);
    if (!targetPlayer) return { error: "Target pemain tidak ditemukan." };

    const myPos = activePlayer.position;
    const targetPos = targetPlayer.position;

    await db.roomPlayer.update({
      where: { id: activePlayer.id },
      data: { position: targetPos, heldCards: updatedCards },
    });

    await db.roomPlayer.update({
      where: { id: targetPlayer.id },
      data: { position: myPos },
    });

    announcementMessage = `${session.user.name} menukar posisi dengan ${targetPlayer.userId}!`;
  } else {
    // Aegis / Mirror Ward (passive held buff)
    await db.roomPlayer.update({
      where: { id: activePlayer.id },
      data: { heldCards: updatedCards },
    });
    announcementMessage = `${session.user.name} mengaktifkan ${cardId.toUpperCase()}!`;
  }

  await pusherServer.trigger(`presence-room-${roomCode}`, "card-used", {
    userId: session.user.id,
    cardId,
    announcement: announcementMessage,
  });

  revalidatePath(`/room/${roomCode}/play`);
  return { success: true };
}

export async function rematchRoom(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room) return { error: "Room tidak ditemukan." };
  if (room.hostUserId !== session.user.id) {
    return { error: "Hanya Host yang bisa merekrut giliran ulang (rematch)." };
  }

  // Reset all players to tile 1, not ready, and reset winner flags
  await db.roomPlayer.updateMany({
    where: { roomId: room.id },
    data: {
      position: 1,
      isReady: false,
      isWinner: false,
      usedAbility: false,
      heldCards: [],
    },
  });

  // Set room status back to LOBBY
  await db.room.update({
    where: { id: room.id },
    data: {
      status: "LOBBY",
      currentTurnIndex: 0,
      startedAt: null,
      endedAt: null,
    },
  });

  await pusherServer.trigger(`presence-room-${roomCode}`, "room-rematched", {
    byUserId: session.user.id,
  });

  revalidatePath(`/room/${roomCode}`);
  return { success: true };
}

export async function rollDice(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Transactional load of room, theme, and players
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: {
        players: {
          orderBy: { turnOrder: "asc" },
        },
      },
    });

    if (!room || room.status !== "IN_PROGRESS") {
      return { error: "Permainan tidak aktif." };
    }

    // 1. Validate active turn player
    const activePlayer = room.players.find(
      (p: any) => p.turnOrder === room.currentTurnIndex
    );
    if (!activePlayer || activePlayer.userId !== session.user.id) {
      return { error: "Bukan giliranmu saat ini!" };
    }

    // Map RoomPlayer DB models to engine PlayerState interface
    const mappedPlayers: PlayerState[] = room.players.map((p: any) => ({
      userId: p.userId,
      characterId: p.characterId,
      position: p.position,
      isReady: p.isReady,
      heldCards: Array.isArray(p.heldCards) ? (p.heldCards as string[]) : [],
      usedAbility: p.usedAbility,
      isWinner: p.isWinner,
      turnOrder: p.turnOrder,
    }));

    // 2. Resolve turn on server using our core game engine
    const resolution = resolveTurn(mappedPlayers, room.currentTurnIndex);

    // 3. Persist state changes in Neon PostgreSQL
    // Update player position, held cards, win status
    await db.roomPlayer.update({
      where: { id: activePlayer.id },
      data: {
        position: resolution.finalPosition,
        heldCards: mappedPlayers.find((p: any) => p.userId === activePlayer.userId)?.heldCards || [],
        usedAbility: mappedPlayers.find((p: any) => p.userId === activePlayer.userId)
          ?.usedAbility,
        isWinner: resolution.winnerUserId === activePlayer.userId,
      },
    });

    // Write log entry `GameMove`
    await db.gameMove.create({
      data: {
        roomId: room.id,
        roomPlayerId: activePlayer.id,
        diceResult: resolution.diceRoll + resolution.rollModifier,
        fromTile: activePlayer.position,
        toTile: resolution.finalPosition,
        effectType: resolution.effectTriggered?.type || null,
        effectDetail: resolution.effectTriggered
          ? JSON.stringify(resolution.effectTriggered)
          : undefined, // using undefined to write standard SQL NULL
      },
    });

    // Update Room overall status & turn index
    const statusUpdate = resolution.winnerUserId ? "FINISHED" : "IN_PROGRESS";
    await db.room.update({
      where: { id: room.id },
      data: {
        currentTurnIndex: resolution.nextTurnIndex,
        status: statusUpdate,
        endedAt: resolution.winnerUserId ? new Date() : null,
      },
    });

    // 4. Trigger Pusher realtime channel event
    await pusherServer.trigger(`presence-room-${roomCode}`, "turn-resolved", {
      userId: session.user.id,
      diceRoll: resolution.diceRoll,
      rollModifier: resolution.rollModifier,
      path: resolution.path,
      effectTriggered: resolution.effectTriggered,
      finalPosition: resolution.finalPosition,
      nextTurnIndex: resolution.nextTurnIndex,
      winnerUserId: resolution.winnerUserId,
      cardDrawn: resolution.cardDrawn,
    });

    // Revalidate paths
    revalidatePath(`/room/${roomCode}/play`);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Gagal memproses giliran." };
  }
}
