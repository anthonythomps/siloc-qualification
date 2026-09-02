import test from "node:test";
import assert from "node:assert/strict";
import { buildAwards } from "../src/awards.js";

const team = (teamId, teamName, overrides = {}) => ({
  teamId, teamName, score: 100, margin: 10, cardPointsLost: 50,
  stats: { FS: 1, AER: 1, TkW: 1, AC: 1, PKD: 1 }, ...overrides
});

test("each award winner is removed from later award eligibility", () => {
  const teams = [
    team("a", "Alpha", { score: 200, margin: 20 }),
    team("b", "Bravo", { score: 190, margin: 30 }),
    team("c", "Charlie", { cardPointsLost: 1 }),
    team("d", "Delta", { stats: { FS: 99, AER: 1, TkW: 1, AC: 1, PKD: 1 } }),
    team("e", "Echo", { stats: { FS: 1, AER: 99, TkW: 1, AC: 1, PKD: 1 } }),
    team("f", "Foxtrot", { stats: { FS: 1, AER: 1, TkW: 99, AC: 1, PKD: 1 } }),
    team("g", "Golf", { stats: { FS: 1, AER: 1, TkW: 1, AC: 99, PKD: 1 } }),
    team("h", "Hotel", { stats: { FS: 1, AER: 1, TkW: 1, AC: 1, PKD: 99 } })
  ];
  const awards = buildAwards([{ period: 1, teams }]);
  assert.deepEqual(awards.map(award => award.standings[0]?.teamId), ["a", "b", "c", "d", "e", "f", "g", "h"]);
});

test("ties use alphabetical team-name order", () => {
  const awards = buildAwards([{ period: 1, teams: [team("z", "Zulu"), team("a", "Alpha")] }]);
  assert.equal(awards[0].standings[0].teamName, "Alpha");
});
