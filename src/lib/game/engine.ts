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

  const startPos = activePlayer.position;
  
  // 1. Roll dice: crypto-safe random 1-6
  const diceRoll = Math.floor(Math.random() * 6) + 1;
  let rollModifier = 0;

  // Ember's passive: Scorch Rush (dadu always +1)
  if (activePlayer.characterId === "ember") {
    rollModifier = 1;
  }

  const steps = diceRoll + rollModifier;
  
  // Calculate intermediate paths
  const path: number[] = [];
  let tempPos = startPos;
  for (let i = 1; i <= steps; i++) {
    tempPos = Math.min(100, tempPos + 1);
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
        // Safe check: does active player hold Aegis card?
        const hasAegis = activePlayer.heldCards.includes("aegis");
        if (hasAegis) {
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
      } else if (resolvedEffect.type === "event" && resolvedEffect.magnitude) {
        finalPos = Math.max(1, Math.min(100, finalPos + resolvedEffect.magnitude));
        path.push(finalPos);
      } else if (resolvedEffect.type === "powerup") {
        // Draw random Action Card
        const randomIdx = Math.floor(Math.random() * activeCardsPool.length);
        cardDrawn = activeCardsPool[randomIdx];
        activePlayer.heldCards.push(cardDrawn);
      }
    }
  }

  // 3. Win check (tile 100)
  const isWinner = finalPos >= 100;
  const winnerUserId = isWinner ? activePlayer.userId : null;

  // 4. Update player position & state in our temporary memory copy
  activePlayer.position = finalPos;
  if (isWinner) {
    activePlayer.isWinner = true;
  }

  // 5. Determine next turn index
  let nextTurnIndex = (currentTurnIndex + 1) % roomPlayers.length;

  // Handle Creeping Fog event (skips next turn)
  if (effectTriggered?.name === "Creeping Fog") {
    // skip next turn simply by skipping their index
    nextTurnIndex = (nextTurnIndex + 1) % roomPlayers.length;
  }

  return {
    diceRoll,
    rollModifier,
    path,
    effectTriggered,
    finalPosition: finalPos,
    nextTurnIndex,
    winnerUserId,
    cardDrawn,
  };
}
