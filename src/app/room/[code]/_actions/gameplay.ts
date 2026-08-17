"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher-server";
import { resolveTurn } from "@/lib/game/engine";
import { PlayerState } from "@/lib/game/abilities";
import { revalidatePath } from "next/cache";

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
