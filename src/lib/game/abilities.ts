import { TileEffect } from "./board";

export interface PlayerState {
  userId: string;
  characterId: string;
  position: number;
  isReady: boolean;
  heldCards: string[]; // array of action card IDs
  usedAbility: boolean;
  isWinner: boolean;
  turnOrder: number; // added to support turn standings check inside engine
}

export interface AbilityContext {
  actingPlayer: PlayerState;
  allPlayers: PlayerState[];
  pendingEffect: TileEffect | null;
}

export interface AbilityResult {
  modifiedEffect: TileEffect | null;
  usedCharge: boolean;
}

/**
 * Dawn (Human Knight) - Guardian's Ward: Block 1 hazard effect fully (Active, 1x/match)
 */
export function resolveGuardiansWard(context: AbilityContext): AbilityResult {
  if (context.actingPlayer.usedAbility) {
    return { modifiedEffect: context.pendingEffect, usedCharge: false };
  }

  if (context.pendingEffect?.type === "hazard") {
    // Nullify the hazard fully
    return {
      modifiedEffect: null,
      usedCharge: true,
    };
  }

  return { modifiedEffect: context.pendingEffect, usedCharge: false };
}

/**
 * Thistle (Dwarf Guardian) - Stone Stance: Hazard penalty reduced by 50% (Passive, auto)
 */
export function resolveStoneStance(context: AbilityContext): AbilityResult {
  if (context.pendingEffect?.type === "hazard" && context.pendingEffect.targetTile !== undefined) {
    const currentPos = context.actingPlayer.position;
    const targetPos = context.pendingEffect.targetTile;
    const dropDistance = currentPos - targetPos;

    // Reduce drop penalty by 50% (rounded down drop distance, meaning player drops less)
    const reducedDrop = Math.floor(dropDistance / 2);
    const newTargetTile = Math.max(1, currentPos - reducedDrop);

    return {
      modifiedEffect: {
        ...context.pendingEffect,
        description: `${context.pendingEffect.description} (Stone Stance: Kena setengah jarak!)`,
        targetTile: newTargetTile,
      },
      usedCharge: false,
    };
  }

  return { modifiedEffect: context.pendingEffect, usedCharge: false };
}

/**
 * Ember (Dragonkin Warrior) - Scorch Rush: Dice always +1, but hazard penalties are 2x (Passive, permanent)
 */
export function resolveScorchRush(context: AbilityContext): AbilityResult {
  if (context.pendingEffect?.type === "hazard" && context.pendingEffect.targetTile !== undefined) {
    const currentPos = context.actingPlayer.position;
    const targetPos = context.pendingEffect.targetTile;
    const dropDistance = currentPos - targetPos;

    // 2x drop penalty (meaning drop further down)
    const doubleDrop = dropDistance * 2;
    const newTargetTile = Math.max(1, currentPos - doubleDrop);

    return {
      modifiedEffect: {
        ...context.pendingEffect,
        description: `${context.pendingEffect.description} (Scorch Rush: Efek negatif 2x lipat!)`,
        targetTile: newTargetTile,
      },
      usedCharge: false,
    };
  }

  return { modifiedEffect: context.pendingEffect, usedCharge: false };
}

/**
 * Marrow (Skeleton Wanderer) - Second Wind: If hazard returns to 1, land at nearest 10-tile milestone instead (1x/match)
 */
export function resolveSecondWind(context: AbilityContext): AbilityResult {
  if (context.actingPlayer.usedAbility) {
    return { modifiedEffect: context.pendingEffect, usedCharge: false };
  }

  if (context.pendingEffect?.type === "hazard" && context.pendingEffect.targetTile === 1) {
    const lastPos = context.actingPlayer.position;
    // Milestone nearest 10-tile passed (e.g. 24 -> 20, 9 -> 1)
    const milestone = Math.max(1, Math.floor(lastPos / 10) * 10);

    return {
      modifiedEffect: {
        ...context.pendingEffect,
        description: `${context.pendingEffect.description} (Second Wind: Bertahan di milestone tile ${milestone}!)`,
        targetTile: milestone,
      },
      usedCharge: true,
    };
  }

  return { modifiedEffect: context.pendingEffect, usedCharge: false };
}
