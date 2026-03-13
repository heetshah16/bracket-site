import type { BracketSlot, ProjectedOpponent } from "@/types/player";

const TOTAL_PLAYERS = 956;

/**
 * Global match ID system for a 1024-player single-elimination bracket.
 *
 * Every match in the bracket gets a unique global ID:
 *   Round 1:  IDs    1 –  512  (512 matches)
 *   Round 2:  IDs  513 –  768  (256 matches)
 *   Round 3:  IDs  769 –  896  (128 matches)
 *   Round 4:  IDs  897 –  960  ( 64 matches)
 *   Round 5:  IDs  961 –  992  ( 32 matches)
 *
 * Wiring rule: R1 matches 2k-1 and 2k both feed R2 match (512 + k).
 * Equivalently, for any match with local position p within its round,
 * the parent match has local position ceil(p/2) in the next round.
 *
 * Global IDs per round start at ROUND_OFFSET[round-1]:
 */
const ROUND_OFFSET = [0, 512, 768, 896, 960, 992];
// ROUND_OFFSET[r-1] = sum of all matches in rounds 1..(r-1)

/** Convert local position within a round (1-indexed) to a global match ID. */
function globalId(round: number, localPos: number): number {
  return ROUND_OFFSET[round - 1] + localPos;
}

/** The local position (1-indexed) within its round for a global match ID. */
function localPos(round: number, gid: number): number {
  return gid - ROUND_OFFSET[round - 1];
}

/**
 * The sibling match that feeds the same parent: odd local position pairs with even.
 * e.g. local 1 ↔ local 2,  local 3 ↔ local 4, etc.
 */
function siblingLocalPos(pos: number): number {
  return pos % 2 === 1 ? pos + 1 : pos - 1;
}

// In the SVG, two players in the same match have y values ~50px apart.
// The gap between consecutive matches is larger (~60px dead space).
// 70px threshold: closer = same match, further = different match (bye).
const SAME_MATCH_Y_THRESHOLD = 70;

interface SlotWithMatch extends BracketSlot {
  /** Global match ID (1-indexed, round 1 only) */
  globalMatchId: number;
}

/**
 * Pairs R1 slots by y-proximity and assigns each pair a global match ID.
 * Returns:
 *   slotBySeed       seed → SlotWithMatch (with globalMatchId)
 *   seedsByGlobalId  globalMatchId → seed list for that R1 match
 */
function buildLookups(slots: BracketSlot[]): {
  slotBySeed: Map<number, SlotWithMatch>;
  seedsByGlobalId: Map<number, number[]>;
} {
  const r1Slots = slots.filter((s) => s.round === 1).sort((a, b) => a.y - b.y);

  const slotBySeed = new Map<number, SlotWithMatch>();
  const seedsByGlobalId = new Map<number, number[]>();

  let localMatchPos = 0;
  let i = 0;

  while (i < r1Slots.length) {
    localMatchPos++;
    const gid = globalId(1, localMatchPos);
    const top = r1Slots[i];
    const bot = r1Slots[i + 1];

    const sameMatch =
      bot !== undefined && Math.abs(bot.y - top.y) < SAME_MATCH_Y_THRESHOLD;

    if (sameMatch) {
      slotBySeed.set(top.seed, { ...top, globalMatchId: gid });
      slotBySeed.set(bot.seed, { ...bot, globalMatchId: gid });
      seedsByGlobalId.set(gid, [top.seed, bot.seed]);
      i += 2;
    } else {
      // Bye match — only one player has a text node in the SVG
      slotBySeed.set(top.seed, { ...top, globalMatchId: gid });
      seedsByGlobalId.set(gid, [top.seed]);
      i += 1;
    }
  }

  return { slotBySeed, seedsByGlobalId };
}

function isBye(seed: number): boolean {
  return seed > TOTAL_PLAYERS;
}

/**
 * Given an R1 global match ID and a lookahead level, returns all R1 seeds
 * that fall in the opposing section of the bracket at that round.
 *
 *   lookahead=1  → R2 opponent  (sibling R1 match,  1 R1 match)
 *   lookahead=2  → R3 opponent  (sibling R2 section, 2 R1 matches)
 *   lookahead=3  → R4 opponent  (sibling R3 section, 4 R1 matches)
 *   lookahead=4  → R5 opponent  (sibling R4 section, 8 R1 matches)
 *
 * Uses the global match ID tree:
 *   parent of R1 local p  →  R2 local ceil(p/2)
 *   parent of R2 local q  →  R3 local ceil(q/2)
 *   etc.
 */
function getSeedsForLookahead(
  myR1GlobalId: number,
  lookahead: number,
  seedsByGlobalId: Map<number, number[]>
): number[] {
  // Walk up (lookahead-1) levels to find my ancestor match at round (lookahead)
  // round 1 local pos:
  let myLocalAtRound = localPos(1, myR1GlobalId); // local position in round 1

  // Walk up to round `lookahead` (not lookahead+1 — we stop one level below the sibling pivot)
  for (let r = 1; r < lookahead; r++) {
    myLocalAtRound = Math.ceil(myLocalAtRound / 2);
  }

  // Sibling at round `lookahead` level
  const sibLocal = siblingLocalPos(myLocalAtRound);

  // The R1 matches that feed sibLocal at round `lookahead` are a contiguous block.
  // Each match at round r feeds 2^(r-1) R1 matches.
  const r1PerSibMatch = Math.pow(2, lookahead - 1);
  const r1Start = (sibLocal - 1) * r1PerSibMatch + 1; // first R1 local pos in that block

  const seeds: number[] = [];
  for (let r1Local = r1Start; r1Local < r1Start + r1PerSibMatch; r1Local++) {
    const gid = globalId(1, r1Local);
    seeds.push(...(seedsByGlobalId.get(gid) ?? []));
  }
  return seeds;
}

/**
 * Returns projected opponents for rounds 1–5 derived from
 * the actual bracket layout (y-coordinate pairing) in bracket-slots.json.
 */
export function getProjectedOpponents(
  seed: number,
  slots: BracketSlot[]
): ProjectedOpponent[] {
  const { slotBySeed, seedsByGlobalId } = buildLookups(slots);

  const mySlot = slotBySeed.get(seed);
  if (!mySlot) return [];

  const myGid = mySlot.globalMatchId;

  // Round 1: opponent in the same R1 match
  const r1Seeds = seedsByGlobalId.get(myGid) ?? [];
  const r1OppSeed = r1Seeds.find((s) => s !== seed) ?? -1;

  const results: ProjectedOpponent[] = [
    { round: 1, opponentSeed: r1OppSeed, isBye: r1OppSeed === -1 || isBye(r1OppSeed) },
  ];

  // Rounds 2–5: look at the opposing section at each level
  for (let lookahead = 1; lookahead <= 4; lookahead++) {
    const candidateSeeds = getSeedsForLookahead(myGid, lookahead, seedsByGlobalId);
    // Best-case projected opponent = the top seed (lowest seed number) in that section
    const oppSeed = candidateSeeds.length > 0 ? Math.min(...candidateSeeds) : -1;
    results.push({
      round: lookahead + 1,
      opponentSeed: oppSeed,
      isBye: oppSeed === -1 || isBye(oppSeed),
    });
  }

  return results;
}

/** Returns display label for a round number (1024-player bracket) */
export function roundLabel(round: number): string {
  const labels: Record<number, string> = {
    1:  "Round 1 — Round of 1024",
    2:  "Round 2 — Round of 512",
    3:  "Round 3 — Round of 256",
    4:  "Round 4 — Round of 128",
    5:  "Round 5 — Round of 64",
    6:  "Round 6 — Round of 32",
    7:  "Round 7 — Round of 16",
    8:  "Round 8 — Quarterfinal",
    9:  "Round 9 — Semifinal",
    10: "Round 10 — Grand Final",
  };
  return labels[round] ?? `Round ${round}`;
}
