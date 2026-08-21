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

  test("should use Wren's pending roll when Foresight preview is accepted", () => {
    players[0].characterId = "wren";
    players[0].pendingDiceRoll = 6;

    const res = resolveTurn(players, 0);
    assert.strictEqual(res.diceRoll, 6, "Must consume Wren's pending dice roll");
    assert.strictEqual(players[0].pendingDiceRoll, null, "Pending roll must be cleared");
  });
});
