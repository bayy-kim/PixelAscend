import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { resolveTurn } from "../lib/game/engine";
import { PlayerState } from "../lib/game/abilities";

describe("PixelAscend Game Engine", () => {
  let players: PlayerState[];

  beforeEach(() => {
    players = [
      {
        userId: "user-1",
        characterId: "dawn",
        position: 0,
        isReady: true,
        heldCards: [],
        usedAbility: false,
        isWinner: false,
        turnOrder: 0,
      },
      {
        userId: "user-2",
        characterId: "ember",
        position: 0,
        isReady: true,
        heldCards: [],
        usedAbility: false,
        isWinner: false,
        turnOrder: 1,
      },
    ];
  });

  test("should handle standard roll moves and turn progression", () => {
    const res = resolveTurn(players, 0);
    assert.ok(res.diceRoll >= 1 && res.diceRoll <= 6, "Dice roll must be between 1 and 6");
    assert.ok(res.finalPosition > 0, "Final position must be greater than 0");
    assert.strictEqual(res.nextTurnIndex, 1, "Next turn index must advance");
  });

  test("should apply Ember's Scorch Rush +1 dice bonus", () => {
    const res = resolveTurn(players, 1);
    assert.strictEqual(res.rollModifier, 1, "Ember must have a +1 modifier");
  });

  test("should handle Creeping Fog personal skip turn for same player", () => {
    players[0].skipNextTurn = true;
    const res = resolveTurn(players, 0);

    assert.strictEqual(res.turnSkipped, true, "Turn must be skipped");
    assert.strictEqual(res.turnSkippedReason, "Creeping Fog");
    assert.strictEqual(res.diceRoll, 0, "Dice roll must be 0 when turn skipped");
    assert.strictEqual(players[0].skipNextTurn, false, "skipNextTurn flag must be reset to false");
    assert.strictEqual(res.nextTurnIndex, 1, "Next turn index must proceed normally to next player");
  });

  test("should handle Swiftness Brew double dice roll for next turn", () => {
    players[0].doubleDiceNextTurn = true;
    const res = resolveTurn(players, 0);

    assert.strictEqual(players[0].doubleDiceNextTurn, false, "doubleDiceNextTurn flag must be consumed");
    assert.ok(res.path.length >= 2, "Path steps must reflect doubled dice roll");
  });

  test("should block hazard using Dawn's Guardian's Ward when armed", () => {
    players[0].position = 17; // Hazard tile
    players[0].guardiansWardArmed = true;

    // Simulate landing on tile 17 with hazard
    const res = resolveTurn(players, 0);
    assert.strictEqual(players[0].usedAbility, true, "Guardian's Ward charge must be used");
    assert.strictEqual(players[0].guardiansWardArmed, false, "Shield must be disarmed");
  });

  test("should bounce back properly when overshooting Tile 100", () => {
    // Start tile 97, dadu 5 → finalPos harus 98
    players[0].position = 97;
    players[0].characterId = "wren";
    players[0].pendingDiceRoll = 5;
    let res = resolveTurn(players, 0);
    assert.strictEqual(res.finalPosition, 98);
    assert.strictEqual(res.winnerUserId, null);

    // Start tile 98, dadu 3 → finalPos harus 99
    players[0].position = 98;
    players[0].pendingDiceRoll = 3;
    res = resolveTurn(players, 0);
    assert.strictEqual(res.finalPosition, 99);

    // Start tile 95, dadu 8 (simulate roll + modifier) → finalPos harus 97
    players[0].position = 95;
    players[0].characterId = "ember"; // Scorch Rush +1
    players[0].pendingDiceRoll = null; // We use normal roll
    // Temporarily mock Math.random to return 7 (dadu 7 -> +1 = 8)
    const originalRandom = Math.random;
    Math.random = () => 0.999; // Math.floor(0.999 * 6) + 1 = 6. Plus 1 from Ember = 7 steps. Wait, dice max is 6.
    Math.random = () => 0.999; // returns 6
    // If ember rolls 6, steps = 6 + 1 = 7. Let's use position 96 to test 7 steps -> 97.
    players[0].position = 96;
    res = resolveTurn(players, 0);
    Math.random = originalRandom;
    assert.strictEqual(res.finalPosition, 97);

    // Start tile 97, dadu 3 (pas tepat ke 100) → finalPos harus 100 DAN terdeteksi menang
    players[0].position = 97;
    players[0].characterId = "wren";
    players[0].pendingDiceRoll = 3;
    res = resolveTurn(players, 0);
    assert.strictEqual(res.finalPosition, 100);
    assert.strictEqual(res.winnerUserId, "user-1");
  });

  test("should reset player to Tile 1 on 3 consecutive 6s penalty", () => {
    players[0].consecutiveSixes = 2;
    players[0].characterId = "wren";
    players[0].pendingDiceRoll = 6;

    const res = resolveTurn(players, 0);
    assert.strictEqual(res.overchargedReset, true, "Player must trigger 3x Sixes Overcharge Reset");
    assert.strictEqual(res.finalPosition, 1, "Player must be reset to Tile 1");
    assert.strictEqual(res.consecutiveSixes, 0, "Streak counter must be reset");
  });
});
