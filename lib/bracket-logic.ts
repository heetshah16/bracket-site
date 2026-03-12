import type { ProjectedOpponent } from "@/types/player";

// Tournament constants
// 956 players in a 1024-slot bracket (next power of 2).
// Seeds 957-1024 are byes. Top seeds face byes in round 1.
const BRACKET_SIZE = 1024;
const TOTAL_PLAYERS = 956;

function isBye(seed: number): boolean {
  return seed > TOTAL_PLAYERS;
}

/**
 * Returns the round-1 opponent seed for a given seed.
 * Standard single-elimination seeding: seed S faces (BRACKET_SIZE + 1 - S).
 */
function getRound1Opponent(seed: number): number {
  return BRACKET_SIZE + 1 - seed;
}

/**
 * In a standard bracket, returns which 1-indexed match slot seed S occupies in round R.
 * Match slots are numbered from 1 (top) in each round.
 */
function getMatchSlot(seed: number, round: number): number {
  return Math.ceil(seed / Math.pow(2, round - 1));
}

/**
 * Returns the "best-case" opponent seed for round R (assuming all higher seeds win).
 * For round 2: the opponent is the top seed of the adjacent match in round 1.
 * For round 3: the top seed of the adjacent group of 4 in round 2.
 */
function getProjectedOpponentForRound(seed: number, round: number): number {
  const groupSize = Math.pow(2, round);
  // Which group of `groupSize` does seed S fall into? (1-indexed)
  const groupIndex = Math.ceil(seed / groupSize);
  // Is seed S in the first or second half of that group?
  const posInGroup = seed - (groupIndex - 1) * groupSize; // 1-indexed within group
  let opponentGroupIndex: number;
  if (posInGroup <= groupSize / 2) {
    // S is in the top half → opponent comes from the bottom half of same group
    opponentGroupIndex = groupIndex * 2; // bottom half's R(round-1) match slot
  } else {
    opponentGroupIndex = groupIndex * 2 - 1; // top half
  }

  // The top seed of that adjacent R1 match (best case opponent)
  const r1MatchTop = (opponentGroupIndex - 1) * 2 + 1;
  const topSeedOfOpponent = r1MatchTop; // seed at the top of that match
  return topSeedOfOpponent;
}

export function getProjectedOpponents(seed: number): ProjectedOpponent[] {
  const results: ProjectedOpponent[] = [];

  // Round 1
  const r1Opp = getRound1Opponent(seed);
  const r1IsBye = isBye(r1Opp);
  results.push({ round: 1, opponentSeed: r1Opp, isBye: r1IsBye });

  // Round 2
  const r2OppSeed = getProjectedOpponentForRound(seed, 2);
  const r2R1Opp = getRound1Opponent(r2OppSeed);
  // Best-case: r2OppSeed won their R1 match; if their R1 opponent was a bye they auto-advanced
  const r2ActualOpp = isBye(r2OppSeed) ? r2R1Opp : r2OppSeed;
  results.push({ round: 2, opponentSeed: r2ActualOpp, isBye: isBye(r2ActualOpp) });

  // Round 3
  const r3OppSeed = getProjectedOpponentForRound(seed, 3);
  const r3ActualOpp = isBye(r3OppSeed) ? getRound1Opponent(r3OppSeed) : r3OppSeed;
  results.push({ round: 3, opponentSeed: r3ActualOpp, isBye: isBye(r3ActualOpp) });

  return results;
}

/** Returns display label for a round number */
export function roundLabel(round: number): string {
  const labels: Record<number, string> = {
    1: "Round 1",
    2: "Round 2",
    3: "Round 3",
    4: "Round of 64",
    5: "Round of 32",
    6: "Round of 16",
    7: "Quarter-Final",
    8: "Semi-Final",
    9: "Final",
  };
  return labels[round] ?? `Round ${round}`;
}
