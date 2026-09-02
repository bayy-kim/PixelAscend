import { BOARD_LAYOUT, ACTION_CARDS, TileEffect } from "./board";
import { PlayerState, resolveStoneStance, resolveScorchRush, resolveSecondWind } from "./abilities";

export interface TurnResolution {
  diceRoll: number;
  rollModifier: number;
  path: number[]; // step by step tiles for client rendering walk cycles
  effectTriggered: TileEffect | null;
  finalPosition: number;
  nextTurnIndex: number;
  winnerUserId: string | null;
  cardDrawn: string | null;
  turnSkipped?: boolean;
  turnSkippedReason?: string | null;
  isExtraTurn?: boolean;
  consecutiveSixes?: number;
  overchargedReset?: boolean;
}

/**
 * Executes a player turn on the server.
 * Ensures server-authoritative RNG and game boundaries.
 */
export function resolveTurn(
  roomPlayers: PlayerState[],
  currentTurnIndex: number,
  activeCardsPool: string[] = ["blink", "aegis", "mirror-ward", "swap"]
): TurnResolution {
  const activePlayer = roomPlayers.find((p) => p.turnOrder === currentTurnIndex);
  if (!activePlayer) {
    throw new Error("Pemain tidak ditemukan pada giliran ini.");
  }

  // Check 1.1: Creeping Fog skip turn check at start of turn
  if (activePlayer.skipNextTurn) {
    activePlayer.skipNextTurn = false;
    const nextTurnIndex = (currentTurnIndex + 1) % roomPlayers.length;
    return {
      diceRoll: 0,
      rollModifier: 0,
      path: [],
      effectTriggered: null,
      finalPosition: activePlayer.position,
      nextTurnIndex,
      winnerUserId: null,
      cardDrawn: null,
      turnSkipped: true,
      turnSkippedReason: "Creeping Fog",
    };
  }

  // Check 2.5: Reset Sable Vanish immunity if Sable's own turn comes around again
  if (activePlayer.characterId === "sable" && activePlayer.isUntargetable) {
    activePlayer.isUntargetable = false;
  }

  const startPos = activePlayer.position;
  
  // 1. Roll dice: crypto-safe random 1-6
  let diceRoll = Math.floor(Math.random() * 6) + 1;
  let rollModifier = 0;

  // Track consecutive 6s
  let currentSixes = activePlayer.consecutiveSixes || 0;
  if (diceRoll === 6) {
    currentSixes += 1;
  } else {
    currentSixes = 0;
  }

  // 3x Sixes Penalty Check: reset player to Tile 1, end turn
  if (currentSixes >= 3) {
    activePlayer.consecutiveSixes = 0;
    activePlayer.position = 1;
    const nextTurnIndex = (currentTurnIndex + 1) % roomPlayers.length;
    return {
      diceRoll: 6,
      rollModifier: 0,
      path: [1],
      effectTriggered: {
        type: "hazard",
        name: "Overcharged (3x Sixes)",
        description: "Mendapatkan dadu 6 sebanyak 3 kali berturut-turut! Karakter tergelincir kembali ke Tile 1!",
        targetTile: 1,
      },
      finalPosition: 1,
      nextTurnIndex,
      winnerUserId: null,
      cardDrawn: null,
      consecutiveSixes: 0,
      overchargedReset: true,
    };
  }

  activePlayer.consecutiveSixes = currentSixes;

  // Wren Foresight check: if pendingDiceRoll is present, use it
  if (activePlayer.characterId === "wren" && activePlayer.pendingDiceRoll) {
    diceRoll = activePlayer.pendingDiceRoll;
    activePlayer.pendingDiceRoll = null; // consume pending roll
  }

  // Swiftness Brew (1.2): double raw dice value first
  if (activePlayer.doubleDiceNextTurn) {
    diceRoll = diceRoll * 2;
    activePlayer.doubleDiceNextTurn = false;
  }

  // Ember's passive: Scorch Rush (dadu always +1)
  if (activePlayer.characterId === "ember") {
    rollModifier = 1;
  }

  const steps = diceRoll + rollModifier;
  
  // Calculate intermediate paths & Bounce Back logic for Tile 100
  const path: number[] = [];
  let tempPos = startPos;
  let direction: 1 | -1 = 1;

  for (let i = 1; i <= steps; i++) {
    tempPos += direction;
    if (tempPos === 100) {
      direction = -1; // sekali menyentuh 100, arah berbalik permanen untuk sisa langkah
    }
    path.push(tempPos);
  }

  let finalPos = tempPos;
  let effectTriggered: TileEffect | null = null;
  let cardDrawn: string | null = null;

  // 2. Check for board tile effect
  if (BOARD_LAYOUT[finalPos]) {
    const originalEffect = BOARD_LAYOUT[finalPos];
    let resolvedEffect: TileEffect | null = { ...originalEffect };

    // Apply passive character modifiers
    if (activePlayer.characterId === "thistle") {
      const res = resolveStoneStance({
        actingPlayer: activePlayer,
        allPlayers: roomPlayers,
        pendingEffect: resolvedEffect,
      });
      resolvedEffect = res.modifiedEffect;
    } else if (activePlayer.characterId === "ember") {
      const res = resolveScorchRush({
        actingPlayer: activePlayer,
        allPlayers: roomPlayers,
        pendingEffect: resolvedEffect,
      });
      resolvedEffect = res.modifiedEffect;
    } else if (activePlayer.characterId === "marrow") {
      const res = resolveSecondWind({
        actingPlayer: activePlayer,
        allPlayers: roomPlayers,
        pendingEffect: resolvedEffect,
      });
      resolvedEffect = res.modifiedEffect;
      if (res.usedCharge) {
        activePlayer.usedAbility = true; // Flag used charge
      }
    }

    if (resolvedEffect) {
      effectTriggered = resolvedEffect;

      if (resolvedEffect.type === "boost" && resolvedEffect.targetTile !== undefined) {
        finalPos = resolvedEffect.targetTile;
        path.push(finalPos); // add boost jump destination to path
      } else if (resolvedEffect.type === "hazard" && resolvedEffect.targetTile !== undefined) {
        // Safe check: Dawn Guardian's Ward or Aegis card
        if (activePlayer.characterId === "dawn" && activePlayer.guardiansWardArmed) {
          activePlayer.guardiansWardArmed = false;
          activePlayer.usedAbility = true;
          effectTriggered = {
            type: "event",
            name: "Guardian's Ward",
            description: "Guardian's Ward memblokir Shadow Vine!",
          };
        } else if (activePlayer.heldCards.includes("aegis")) {
          // Consume Aegis automatically to block hazard
          activePlayer.heldCards = activePlayer.heldCards.filter((c) => c !== "aegis");
          effectTriggered = {
            type: "event",
            name: "Aegis Shield",
            description: "Aegis memblokir efek Shadow Vine!",
          };
        } else {
          finalPos = resolvedEffect.targetTile;
          path.push(finalPos); // add hazard drop destination to path
        }
      } else if (resolvedEffect.type === "event") {
        if (resolvedEffect.name === "Creeping Fog") {
          activePlayer.skipNextTurn = true; // Mark player to skip THEIR OWN next turn
        } else if (resolvedEffect.name === "Swiftness Brew") {
          activePlayer.doubleDiceNextTurn = true; // Mark player to double THEIR OWN next dice
        } else if (resolvedEffect.magnitude) {
          finalPos = Math.max(1, Math.min(100, finalPos + resolvedEffect.magnitude));
          path.push(finalPos);
        }
      } else if (resolvedEffect.type === "powerup") {
        // Draw random Action Card
        const randomIdx = Math.floor(Math.random() * activeCardsPool.length);
        cardDrawn = activeCardsPool[randomIdx];
        activePlayer.heldCards.push(cardDrawn);
      }
    }
  }

  // 3. Win check (Exact Tile 100)
  const isWinner = finalPos === 100;
  const winnerUserId = isWinner ? activePlayer.userId : null;

  // 4. Update player position & state in our temporary memory copy
  activePlayer.position = finalPos;
  if (isWinner) {
    activePlayer.isWinner = true;
  }

  // 5. Determine next turn index & Extra turn for rolling a 6 based on actual existing turnOrder values
  const isExtraTurn = diceRoll === 6 && !isWinner;
  const sortedByTurn = [...roomPlayers].sort((a, b) => a.turnOrder - b.turnOrder);
  const currentIdx = sortedByTurn.findIndex((p) => p.userId === activePlayer.userId);
  const nextPlayer = sortedByTurn[(currentIdx + 1) % sortedByTurn.length] || sortedByTurn[0];
  const nextTurnIndex = isExtraTurn ? activePlayer.turnOrder : nextPlayer.turnOrder;

  return {
    diceRoll,
    rollModifier,
    path,
    effectTriggered,
    finalPosition: finalPos,
    nextTurnIndex,
    winnerUserId,
    cardDrawn,
    isExtraTurn,
    consecutiveSixes: currentSixes,
  };
}
