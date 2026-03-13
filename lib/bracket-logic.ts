import type { BracketTree, PlayerData, ProjectedOpponent } from "@/types/player";

const TOTAL_PLAYERS = 956;

function isBye(seed: number): boolean {
  return seed > TOTAL_PLAYERS;
}

/**
 * Returns the seed most likely to win from a set of candidates.
 * Uses ELO as the primary signal; falls back to lowest seed number if no ELO data.
 */
function likelyWinner(
  seeds: number[],
  players: Record<string, PlayerData>
): number {
  if (seeds.length === 0) return -1;
  return seeds.reduce((best, s) => {
    const bestElo = players[String(best)]?.elo ?? -1;
    const sElo    = players[String(s)]?.elo ?? -1;
    if (sElo !== bestElo) return sElo > bestElo ? s : best;
    // tie-break: lower seed number (higher seeded) wins
    return s < best ? s : best;
  });
}

/**
 * Recursively collects all seeds stored in the leaves (R1 match boxes)
 * under the given match node.
 */
function getSeedsUnder(
  nodes: BracketTree["nodes"],
  matchId: number
): number[] {
  const node = nodes[String(matchId)];
  if (!node) return [];
  // Leaf node (R1 match) — return its seeds directly
  if (node.childIds.length === 0) return node.seeds;
  // Internal node — recurse into children
  return node.childIds.flatMap((id) => getSeedsUnder(nodes, id));
}

/**
 * Returns projected opponents for rounds 1–5 using the bracket match tree.
 *
 * For each round n ≥ 2:
 *   1. Walk UP the tree (n-1) levels from the player's R1 match.
 *   2. At that level, identify the sibling match (the other child of the same parent).
 *   3. Collect ALL seeds under that sibling's subtree.
 *   4. Best-case projected opponent = lowest seed number in that subtree.
 */
export function getProjectedOpponents(
  seed: number,
  tree: BracketTree,
  players: Record<string, PlayerData>
): ProjectedOpponent[] {
  const startId = tree.seedToMatchId[String(seed)];
  if (!startId) return [];

  const results: ProjectedOpponent[] = [];

  // Round 1: the other seed in the same R1 match
  const r1Node = tree.nodes[String(startId)];
  if (!r1Node) return [];
  const r1OppSeed = r1Node.seeds.find((s) => s !== seed) ?? -1;
  results.push({
    round: 1,
    opponentSeed: r1OppSeed,
    isBye: r1OppSeed === -1 || isBye(r1OppSeed),
  });

  // Rounds 2–5: walk up the tree, look at sibling section at each level
  let currentId = startId;
  for (let round = 2; round <= 5; round++) {
    const currentNode = tree.nodes[String(currentId)];
    if (!currentNode?.parentId) break;

    const parentNode = tree.nodes[String(currentNode.parentId)];
    if (!parentNode) break;

    // The sibling is the other child of the parent
    const siblingId = parentNode.childIds.find((id) => id !== currentId);
    if (siblingId === undefined) break;

    // Projected opponent = highest-ELO player under the sibling's subtree
    const candidateSeeds = getSeedsUnder(tree.nodes, siblingId);
    const oppSeed = candidateSeeds.length > 0 ? likelyWinner(candidateSeeds, players) : -1;

    results.push({
      round,
      opponentSeed: oppSeed,
      isBye: oppSeed === -1 || isBye(oppSeed),
    });

    // Advance up the tree for the next iteration
    currentId = currentNode.parentId;
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
