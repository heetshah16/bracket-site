/**
 * enhance-svg.ts
 *
 * 1. Parses bracket(36).svg to extract every player text node → data/bracket-slots.json
 * 2. Injects rank-color fills into those text nodes → public/bracket-enhanced.svg
 * 3. Builds an explicit match tree → data/bracket-tree.json
 *
 * SVG structure (per match):
 *   <svg x="25" y="90" width="300" height="110" viewBox="0 0 300 110">
 *     <g>
 *       <text x="12" y="38" fill="#BEC0C6" ...>PlayerName (#SEED)</text>  ← top player
 *       <text x="12" y="88" fill="#BEC0C6" ...>PlayerName (#SEED)</text>  ← bottom player
 *     </g>
 *   </svg>
 *
 * Match boxes are identified by width="300". All match boxes at the same absolute-x
 * column belong to the same round (COLUMN_WIDTH=350 apart: 25, 375, 725, …).
 *
 * Run after fetch-ranks.ts (or init-players.ts):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/enhance-svg.ts
 */

import * as svgson from "svgson";
import * as fs from "fs";
import * as path from "path";
import type { PlayersJson, BracketSlot, BracketMatchNode, BracketTree } from "../types/player";

const SVG_INPUT  = path.resolve(__dirname, "../../bracket(36).svg");
const SVG_OUTPUT = path.resolve(__dirname, "../public/bracket-enhanced.svg");
const SLOTS_OUTPUT = path.resolve(__dirname, "../data/bracket-slots.json");
const TREE_OUTPUT  = path.resolve(__dirname, "../data/bracket-tree.json");
const PLAYERS_JSON = path.resolve(__dirname, "../data/players.json");

// Match SVG elements are at x=25, 375, 725, 1075, … (350px apart) across 10 rounds.
// Text nodes inside each match are at x=12, giving absolute x values of 37, 387, 737, …
const COLUMN_WIDTH = 350;
const ROUNDS = 10;

const PLAYER_PATTERN = /^(.+?)\s+\(#(\d+)\)$/;

interface SvgNode {
  name: string;
  type: string;
  value: string;
  attributes: Record<string, string>;
  children: SvgNode[];
}

interface MatchBoxData {
  round: number;
  yCenter: number;
  seeds: number[];              // only populated for round-1 match boxes
  // filled in post-processing:
  globalId?: number;
  parentId?: number | null;
  childIds?: number[];
}

// Load player colors
const seedToColor: Record<number, string> = {};
if (fs.existsSync(PLAYERS_JSON)) {
  const playersData = JSON.parse(fs.readFileSync(PLAYERS_JSON, "utf-8")) as PlayersJson;
  const count = Object.keys(playersData.players).length;
  for (const [seed, p] of Object.entries(playersData.players)) {
    seedToColor[Number(seed)] = p.color;
  }
  console.log(`Loaded ${count} player colors from players.json`);
} else {
  console.warn("players.json not found — will extract slots only, no colors injected.");
}

const slots: BracketSlot[] = [];
const allMatchBoxes: MatchBoxData[] = [];

/**
 * Recursively walk the SVG tree.
 *
 * absX/absY: accumulated absolute position from all ancestor <svg> x/y attributes.
 * currentMatchBox: the MatchBoxData for the innermost match-box <svg> ancestor, or null.
 */
function walkNode(
  node: SvgNode,
  absX: number,
  absY: number,
  currentMatchBox: MatchBoxData | null
): void {
  let childAbsX = absX;
  let childAbsY = absY;
  let childMatchBox = currentMatchBox;

  if (node.name === "svg") {
    childAbsX += parseFloat(node.attributes?.x ?? "0") || 0;
    childAbsY += parseFloat(node.attributes?.y ?? "0") || 0;

    // Match-box SVGs have width="300" (root SVG has width="3550")
    if (node.attributes?.width === "300") {
      const height = parseFloat(node.attributes?.height ?? "110") || 110;
      const round = Math.min(Math.max(Math.floor(childAbsX / COLUMN_WIDTH) + 1, 1), ROUNDS);
      const newBox: MatchBoxData = {
        round,
        yCenter: childAbsY + height / 2,
        seeds: [],
        childIds: [],
      };
      allMatchBoxes.push(newBox);
      childMatchBox = newBox;
    }
  }

  // Remove the full-canvas background rect so the SVG is transparent
  if (
    node.name === "rect" &&
    node.attributes?.width === "3550" &&
    node.attributes?.height === "82035"
  ) {
    node.attributes = { ...node.attributes, fill: "none" };
  }

  // Process player text nodes
  if (node.name === "text" && childMatchBox) {
    const textContent = (node.children ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.value)
      .join("")
      .trim();

    const m = textContent.match(PLAYER_PATTERN);
    if (m) {
      const seed = parseInt(m[2], 10);
      const textX = parseFloat(node.attributes?.x ?? "0") || 0;
      const textY = parseFloat(node.attributes?.y ?? "0") || 0;
      const absoluteX = childAbsX + textX;
      const absoluteY = childAbsY + textY;
      const position: "top" | "bottom" = childMatchBox.seeds.length === 0 ? "top" : "bottom";

      // R1 match boxes get their seeds stored for the tree.
      // R2+ match boxes have pre-filled bye players — skip (they're already in R1 match boxes).
      if (childMatchBox.round === 1) {
        childMatchBox.seeds.push(seed);
      }

      // Always store slot data so BracketViewer can zoom to any round's text position
      slots.push({
        seed,
        round: childMatchBox.round,
        matchIndex: 0, // filled in post-processing
        position,
        x: Math.round(absoluteX),
        y: Math.round(absoluteY),
      });

      // Inject fill color
      const color = seedToColor[seed];
      if (color) {
        node.attributes = { ...node.attributes, fill: color };
      }
    }
  }

  for (const child of node.children ?? []) {
    walkNode(child, childAbsX, childAbsY, childMatchBox);
  }
}

async function main() {
  console.log("Reading SVG…");
  const svgRaw = fs.readFileSync(SVG_INPUT, "utf-8");

  console.log("Parsing SVG (may take a moment)…");
  const parsed = await svgson.parse(svgRaw, { camelcase: false }) as SvgNode;

  console.log("Extracting match boxes and injecting colors…");
  walkNode(parsed, 0, 0, null);

  // ── Build match tree ──────────────────────────────────────────────────────

  // Group match boxes by round, sorted by yCenter
  const byRound = new Map<number, MatchBoxData[]>();
  for (const mb of allMatchBoxes) {
    if (!byRound.has(mb.round)) byRound.set(mb.round, []);
    byRound.get(mb.round)!.push(mb);
  }
  for (const mbs of byRound.values()) {
    mbs.sort((a, b) => a.yCenter - b.yCenter);
  }

  const sortedRounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  console.log("Match box counts per round:");
  for (const r of sortedRounds) {
    console.log(`  Round ${r}: ${byRound.get(r)!.length} match boxes`);
  }

  // Assign global IDs: Round 1 gets IDs 1..n1, Round 2 gets n1+1..n1+n2, etc.
  let idCounter = 0;
  const roundOffset: Record<number, number> = {};
  for (const round of sortedRounds) {
    roundOffset[round] = idCounter;
    const mbs = byRound.get(round)!;
    mbs.forEach((mb, i) => {
      mb.globalId = idCounter + i + 1;
      mb.childIds = [];
    });
    idCounter += mbs.length;
  }
  console.log(`Total match boxes: ${idCounter}`);

  // Derive parent-child relationships using y-center midpoint matching.
  // For each round r, consecutive pairs of match boxes (sorted by y) feed a single
  // match box in round r+1. We find that parent by choosing the round-(r+1) match box
  // whose yCenter is closest to the midpoint of the two children's yCenters.
  for (const round of sortedRounds) {
    const nextRound = round + 1;
    if (!byRound.has(nextRound)) continue;

    const currentMbs = byRound.get(round)!;   // sorted by yCenter
    const nextMbs    = byRound.get(nextRound)!; // sorted by yCenter

    for (let i = 0; i < currentMbs.length; i += 2) {
      const mb1 = currentMbs[i];
      const mb2 = currentMbs[i + 1]; // may be undefined if odd count

      const midY = mb2
        ? (mb1.yCenter + mb2.yCenter) / 2
        : mb1.yCenter;

      // Nearest next-round match box (by y-center distance)
      const parent = nextMbs.reduce((best, mb) =>
        Math.abs(mb.yCenter - midY) < Math.abs(best.yCenter - midY) ? mb : best
      );

      mb1.parentId = parent.globalId;
      parent.childIds!.push(mb1.globalId!);

      if (mb2) {
        mb2.parentId = parent.globalId;
        parent.childIds!.push(mb2.globalId!);
      }
    }
  }

  // Set parentId=null for the last round (no parent)
  const lastRound = sortedRounds[sortedRounds.length - 1];
  for (const mb of byRound.get(lastRound) ?? []) {
    if (mb.parentId === undefined) mb.parentId = null;
  }

  // Build seedToMatchId from R1 match boxes only
  const seedToMatchId: Record<string, number> = {};
  for (const mb of byRound.get(1) ?? []) {
    for (const seed of mb.seeds) {
      seedToMatchId[String(seed)] = mb.globalId!;
    }
  }

  // Assemble tree nodes
  const nodes: Record<string, BracketMatchNode> = {};
  let localPos = 1;
  let prevRound = -1;
  for (const round of sortedRounds) {
    if (round !== prevRound) { localPos = 1; prevRound = round; }
    for (const mb of byRound.get(round)!) {
      nodes[String(mb.globalId!)] = {
        round,
        localPos: localPos++,
        seeds: mb.seeds,
        parentId: mb.parentId ?? null,
        childIds: mb.childIds!,
      };
    }
  }

  // Fix localPos reset (the loop above has a bug — fix it)
  for (const round of sortedRounds) {
    const mbs = byRound.get(round)!;
    mbs.forEach((mb, i) => {
      nodes[String(mb.globalId!)].localPos = i + 1;
    });
  }

  const bracketTree: BracketTree = { nodes, seedToMatchId };

  // Update bracket-slots.json matchIndex with globalId
  const slotSeedToGlobalId: Record<number, number> = {};
  for (const mb of allMatchBoxes) {
    for (const seed of mb.seeds) slotSeedToGlobalId[seed] = mb.globalId!;
  }
  // Also map R2+ bye player text nodes to their R1 matchId for the zoom feature
  for (const slot of slots) {
    slot.matchIndex = slotSeedToGlobalId[slot.seed] ?? 0;
  }

  // Prepend <style> block for tier CSS classes
  const styleNode: SvgNode = {
    name: "style",
    type: "element",
    value: "",
    attributes: {},
    children: [{
      name: "",
      type: "text",
      value: `
  .tier-netherite { fill: #9333EA; }
  .tier-diamond   { fill: #60A5FA; }
  .tier-emerald   { fill: #34D399; }
  .tier-gold      { fill: #FBBF24; }
  .tier-iron      { fill: #E5E7EB; }
  .tier-coal      { fill: #9CA3AF; }
  .tier-unranked  { fill: #555555; }
`,
      attributes: {},
      children: [],
    }],
  };
  parsed.children.unshift(styleNode);

  // Write outputs
  fs.mkdirSync(path.dirname(SLOTS_OUTPUT), { recursive: true });
  fs.writeFileSync(SLOTS_OUTPUT, JSON.stringify(slots, null, 2), "utf-8");
  console.log(`Wrote data/bracket-slots.json with ${slots.length} entries`);

  fs.mkdirSync(path.dirname(TREE_OUTPUT), { recursive: true });
  fs.writeFileSync(TREE_OUTPUT, JSON.stringify(bracketTree, null, 2), "utf-8");
  console.log(`Wrote data/bracket-tree.json with ${Object.keys(nodes).length} nodes, ${Object.keys(seedToMatchId).length} seeds mapped`);

  const enhanced = svgson.stringify(parsed as svgson.INode);
  fs.mkdirSync(path.dirname(SVG_OUTPUT), { recursive: true });
  fs.writeFileSync(SVG_OUTPUT, enhanced, "utf-8");
  console.log(`Wrote public/bracket-enhanced.svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
