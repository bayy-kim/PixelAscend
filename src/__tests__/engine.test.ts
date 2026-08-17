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

  test("should clamp final position to 100 on overshoot", () => {
    players[0].position = 98;
    const res = resolveTurn(players, 0);
    
    assert.ok(res.finalPosition <= 100, "Final position must not exceed 100");
    if (res.finalPosition === 100) {
      assert.strictEqual(res.winnerUserId, "user-1", "Winner must be user-1");
    }
  });
});
