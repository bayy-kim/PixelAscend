"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher-server";
import { resolveTurn } from "@/lib/game/engine";
import { PlayerState } from "@/lib/game/abilities";
import { revalidatePath } from "next/cache";

// 2.1: Dawn - Arm Guardian's Ward
export async function armGuardiansWard(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });
  if (!room) return { error: "Room tidak ditemukan." };

  const player = room.players.find((p: any) => p.userId === session.user.id);
  if (!player || player.characterId !== "dawn" || player.usedAbility) {
    return { error: "Kemampuan Guardian's Ward tidak dapat diaktifkan." };
  }

  await db.roomPlayer.update({
    where: { id: player.id },
    data: { guardiansWardArmed: true },
  });

  await pusherServer.trigger(`presence-room-${roomCode}`, "card-used", {
    userId: session.user.id,
    announcement: `${session.user.name} mengaktifkan perisai Guardian's Ward!`,
  });

  revalidatePath(`/room/${roomCode}/play`);
  return { success: true };
}

// 2.2: Wren - Foresight Preview Roll
export async function rollDicePreview(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: { orderBy: { turnOrder: "asc" } } },
  });
  if (!room || room.status !== "IN_PROGRESS") return { error: "Game tidak aktif." };

  const activePlayer = room.players.find((p: any) => p.turnOrder === room.currentTurnIndex);
  if (!activePlayer || activePlayer.userId !== session.user.id || activePlayer.characterId !== "wren" || activePlayer.usedAbility) {
    return { error: "Tidak memenuhi syarat Foresight." };
  }

  const diceRoll = Math.floor(Math.random() * 6) + 1;
  await db.roomPlayer.update({
    where: { id: activePlayer.id },
    data: { pendingDiceRoll: diceRoll },
  });

  return { success: true, diceRoll };
}

// 2.2: Wren - Execute Foresight Reroll
export async function executeForesightReroll(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: { orderBy: { turnOrder: "asc" } } },
  });
  if (!room) return { error: "Room tidak ditemukan." };

  const activePlayer = room.players.find((p: any) => p.turnOrder === room.currentTurnIndex);
  if (!activePlayer || activePlayer.userId !== session.user.id || activePlayer.characterId !== "wren" || activePlayer.usedAbility) {
    return { error: "Tidak dapat menggunakan reroll Foresight." };
  }

  const newDiceRoll = Math.floor(Math.random() * 6) + 1;
  await db.roomPlayer.update({
    where: { id: activePlayer.id },
    data: { pendingDiceRoll: newDiceRoll, usedAbility: true },
  });

  return { success: true, diceRoll: newDiceRoll };
}

// 2.5: Sable - Arm Vanish
export async function armVanish(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });
  if (!room) return { error: "Room tidak ditemukan." };

  const player = room.players.find((p: any) => p.userId === session.user.id);
  if (!player || player.characterId !== "sable" || player.usedAbility) {
    return { error: "Kemampuan Vanish tidak dapat diaktifkan." };
  }

  await db.roomPlayer.update({
    where: { id: player.id },
    data: { isUntargetable: true, usedAbility: true },
  });

  await pusherServer.trigger(`presence-room-${roomCode}`, "card-used", {
    userId: session.user.id,
    announcement: `${session.user.name} mengaktifkan Vanish (Kebal serangan 1 ronde)!`,
  });

  revalidatePath(`/room/${roomCode}/play`);
  return { success: true };
}

// 2.6: Halcyon - Execute Swift Stride extra steps
export async function executeSwiftStride(roomCode: string, bonusSteps: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: { orderBy: { turnOrder: "asc" } } },
  });
  if (!room) return { error: "Room tidak ditemukan." };

  const player = room.players.find((p: any) => p.userId === session.user.id);
  if (!player || player.characterId !== "halcyon" || player.usedAbility) {
    return { error: "Kemampuan Swift Stride tidak dapat diaktifkan." };
  }

  const steps = Math.min(3, Math.max(1, bonusSteps));
  const newPos = Math.min(100, player.position + steps);
  const isWinner = newPos >= 100;

  await db.roomPlayer.update({
    where: { id: player.id },
    data: { position: newPos, usedAbility: true, isWinner },
  });

  if (isWinner) {
    await db.room.update({
      where: { id: room.id },
      data: { status: "FINISHED", endedAt: new Date() },
    });
  }

  await pusherServer.trigger(`presence-room-${roomCode}`, "turn-resolved", {
    userId: session.user.id,
    diceRoll: steps,
    rollModifier: 0,
    path: [newPos],
    effectTriggered: { type: "event", name: "Swift Stride", description: `Melangkah ${steps} tile tambahan!` },
    finalPosition: newPos,
    nextTurnIndex: room.currentTurnIndex,
    winnerUserId: isWinner ? session.user.id : null,
  });

  revalidatePath(`/room/${roomCode}/play`);
  return { success: true };
}

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

  let swappedPositions: {userId: string; position: number}[] | undefined;

  if (cardId === "blink") {
    const newPos = Math.min(100, activePlayer.position + 5);
    await db.roomPlayer.update({
      where: { id: activePlayer.id },
      data: { position: newPos, heldCards: updatedCards },
    });
    announcementMessage = `${session.user.name} menggunakan Blink! Teleport maju +5 tile.`;
    swappedPositions = [{ userId: activePlayer.userId, position: newPos }];
  } else if (cardId === "swap" && targetUserId) {
    const targetPlayer = room.players.find((p: any) => p.userId === targetUserId);
    if (!targetPlayer) return { error: "Target pemain tidak ditemukan." };

    // 2.5: Check Sable immunity (Vanish)
    if (targetPlayer.characterId === "sable" && targetPlayer.isUntargetable) {
      return { error: "Target pemain (Sable) sedang Vanish, tidak bisa disasar!" };
    }

    // 2.4: Check Brack Retaliation (Passive Counter Swap)
    if (targetPlayer.characterId === "brack") {
      // Caster (activePlayer) moves to Brack's position, Brack DOES NOT MOVE!
      const targetPos = targetPlayer.position;
      await db.roomPlayer.update({
        where: { id: activePlayer.id },
        data: { position: targetPos, heldCards: updatedCards },
      });
      announcementMessage = `Retaliation! Serangan Swap ${session.user.name} dibalikkan oleh Brack!`;
      swappedPositions = [{ userId: activePlayer.userId, position: targetPos }];
    } else {
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
      swappedPositions = [
        { userId: activePlayer.userId, position: targetPos },
        { userId: targetPlayer.userId, position: myPos }
      ];
    }
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
    swappedPositions,
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

    // 1. Validate active turn player with auto-recovery if turnOrder desynced
    let activePlayer = room.players.find(
      (p: any) => p.turnOrder === room.currentTurnIndex
    );
    if (!activePlayer && room.players.length > 0) {
      activePlayer = room.players[0];
      await db.room.update({
        where: { id: room.id },
        data: { currentTurnIndex: activePlayer.turnOrder },
      });
      room.currentTurnIndex = activePlayer.turnOrder;
    }

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
      skipNextTurn: p.skipNextTurn,
      doubleDiceNextTurn: p.doubleDiceNextTurn,
      guardiansWardArmed: p.guardiansWardArmed,
      pendingDiceRoll: p.pendingDiceRoll,
      isUntargetable: p.isUntargetable,
      consecutiveSixes: p.consecutiveSixes || 0,
    }));

    // 2. Resolve turn on server using our core game engine
    const resolution = resolveTurn(mappedPlayers, room.currentTurnIndex);

    // 3. Persist state changes in Neon PostgreSQL
    // Update player position, held cards, win status, skipNextTurn, doubleDiceNextTurn
    const updatedActivePlayerState = mappedPlayers.find((p: any) => p.userId === activePlayer.userId);

    await db.roomPlayer.update({
      where: { id: activePlayer.id },
      data: {
        position: resolution.finalPosition,
        heldCards: updatedActivePlayerState?.heldCards || [],
        usedAbility: updatedActivePlayerState?.usedAbility,
        skipNextTurn: updatedActivePlayerState?.skipNextTurn || false,
        doubleDiceNextTurn: updatedActivePlayerState?.doubleDiceNextTurn || false,
        guardiansWardArmed: updatedActivePlayerState?.guardiansWardArmed || false,
        pendingDiceRoll: null, // Clear pending roll after turn resolution
        isUntargetable: updatedActivePlayerState?.isUntargetable || false,
        consecutiveSixes: resolution.consecutiveSixes || 0,
        isWinner: resolution.winnerUserId === activePlayer.userId,
      },
    });

    // Safely write log entry `GameMove`
    try {
      await db.gameMove.create({
        data: {
          roomId: room.id,
          roomPlayerId: activePlayer.id,
          diceResult: resolution.diceRoll + resolution.rollModifier,
          fromTile: activePlayer.position,
          toTile: resolution.finalPosition,
          effectType: resolution.effectTriggered?.type || null,
          effectDetail: resolution.effectTriggered
            ? (resolution.effectTriggered as any)
            : undefined,
        },
      });
    } catch (moveErr) {
      console.warn("GameMove log warning:", moveErr);
    }

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
      turnSkipped: resolution.turnSkipped,
      turnSkippedReason: resolution.turnSkippedReason,
      isExtraTurn: resolution.isExtraTurn,
      consecutiveSixes: resolution.consecutiveSixes,
      overchargedReset: resolution.overchargedReset,
    });

    // Revalidate paths
    revalidatePath(`/room/${roomCode}/play`);
    return { success: true };
  } catch (err: any) {
    console.error("rollDice error:", err);
    return { error: err?.message || "Gagal memproses giliran." };
  }
}

export async function executeCpuTurn(roomCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
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

    const callerInRoom = room.players.some((p: any) => p.userId === session.user.id);
    if (!callerInRoom) {
      return { error: "Kamu tidak berada di room ini." };
    }

    let activePlayer = room.players.find(
      (p: any) => p.turnOrder === room.currentTurnIndex
    );
    if (!activePlayer && room.players.length > 0) {
      activePlayer = room.players[0];
      await db.room.update({
        where: { id: room.id },
        data: { currentTurnIndex: activePlayer.turnOrder },
      });
      room.currentTurnIndex = activePlayer.turnOrder;
    }

    if (!activePlayer || !activePlayer.userId.startsWith("cpu_")) {
      return { error: "Saat ini bukan giliran CPU." };
    }

    // Smart AI Decision Engine: Pre-turn Card & Skill Execution for CPU Bot
    const cpuCards = Array.isArray(activePlayer.heldCards) ? (activePlayer.heldCards as string[]) : [];

    // 1. Smart Ability: Dawn Guardian's Ward auto-arm
    if (activePlayer.characterId === "dawn" && !activePlayer.usedAbility && !activePlayer.guardiansWardArmed) {
      activePlayer.guardiansWardArmed = true;
      await pusherServer.trigger(`presence-room-${roomCode}`, "card-used", {
        userId: activePlayer.userId,
        announcement: `🤖 CPU Bot mengaktifkan perisai Guardian's Ward!`,
      });
    }

    // 2. Smart Ability: Sable Vanish auto-arm
    if (activePlayer.characterId === "sable" && !activePlayer.usedAbility && !activePlayer.isUntargetable) {
      activePlayer.isUntargetable = true;
      activePlayer.usedAbility = true;
      await pusherServer.trigger(`presence-room-${roomCode}`, "card-used", {
        userId: activePlayer.userId,
        announcement: `🤖 CPU Bot mengaktifkan skill Vanish!`,
      });
    }

    // 3. Smart Action Card: Blink (+5 tiles) if near mid/late game
    if (cpuCards.includes("blink") && activePlayer.position >= 40) {
      const newPos = Math.min(100, activePlayer.position + 5);
      activePlayer.position = newPos;
      activePlayer.heldCards = cpuCards.filter((c) => c !== "blink");
      await pusherServer.trigger(`presence-room-${roomCode}`, "card-used", {
        userId: activePlayer.userId,
        cardId: "blink",
        announcement: `🤖 CPU Bot menggunakan kartu Blink! Teleport +5 tile.`,
        swappedPositions: [{ userId: activePlayer.userId, position: newPos }],
      });
    }

    const mappedPlayers: PlayerState[] = room.players.map((p: any) => ({
      userId: p.userId,
      characterId: p.characterId,
      position: p.position,
      isReady: p.isReady,
      heldCards: Array.isArray(p.heldCards) ? (p.heldCards as string[]) : [],
      usedAbility: p.usedAbility,
      isWinner: p.isWinner,
      turnOrder: p.turnOrder,
      skipNextTurn: p.skipNextTurn,
      doubleDiceNextTurn: p.doubleDiceNextTurn,
      guardiansWardArmed: p.guardiansWardArmed,
      pendingDiceRoll: p.pendingDiceRoll,
      isUntargetable: p.isUntargetable,
      consecutiveSixes: p.consecutiveSixes || 0,
    }));

    const resolution = resolveTurn(mappedPlayers, room.currentTurnIndex);
    const updatedActivePlayerState = mappedPlayers.find((p: any) => p.userId === activePlayer.userId);

    await db.roomPlayer.update({
      where: { id: activePlayer.id },
      data: {
        position: resolution.finalPosition,
        heldCards: updatedActivePlayerState?.heldCards || [],
        usedAbility: updatedActivePlayerState?.usedAbility,
        skipNextTurn: updatedActivePlayerState?.skipNextTurn || false,
        doubleDiceNextTurn: updatedActivePlayerState?.doubleDiceNextTurn || false,
        guardiansWardArmed: updatedActivePlayerState?.guardiansWardArmed || false,
        pendingDiceRoll: null,
        isUntargetable: updatedActivePlayerState?.isUntargetable || false,
        consecutiveSixes: resolution.consecutiveSixes || 0,
        isWinner: resolution.winnerUserId === activePlayer.userId,
      },
    });

    try {
      await db.gameMove.create({
        data: {
          roomId: room.id,
          roomPlayerId: activePlayer.id,
          diceResult: resolution.diceRoll + resolution.rollModifier,
          fromTile: activePlayer.position,
          toTile: resolution.finalPosition,
          effectType: resolution.effectTriggered?.type || null,
          effectDetail: resolution.effectTriggered
            ? (resolution.effectTriggered as any)
            : undefined,
        },
      });
    } catch (moveErr) {
      console.warn("GameMove log warning:", moveErr);
    }

    const statusUpdate = resolution.winnerUserId ? "FINISHED" : "IN_PROGRESS";
    await db.room.update({
      where: { id: room.id },
      data: {
        currentTurnIndex: resolution.nextTurnIndex,
        status: statusUpdate,
        endedAt: resolution.winnerUserId ? new Date() : null,
      },
    });

    await pusherServer.trigger(`presence-room-${roomCode}`, "turn-resolved", {
      userId: activePlayer.userId,
      diceRoll: resolution.diceRoll,
      rollModifier: resolution.rollModifier,
      path: resolution.path,
      effectTriggered: resolution.effectTriggered,
      finalPosition: resolution.finalPosition,
      nextTurnIndex: resolution.nextTurnIndex,
      winnerUserId: resolution.winnerUserId,
      cardDrawn: resolution.cardDrawn,
      turnSkipped: resolution.turnSkipped,
      turnSkippedReason: resolution.turnSkippedReason,
      isExtraTurn: resolution.isExtraTurn,
      consecutiveSixes: resolution.consecutiveSixes,
      overchargedReset: resolution.overchargedReset,
    });

    revalidatePath(`/room/${roomCode}/play`);
    return { success: true };
  } catch (err) {
    console.error("executeCpuTurn error:", err);
    return { error: "Gagal memproses giliran CPU." };
  }
}
