/**
 * enhance-svg.ts
 *
 * 1. Parses bracket(36).svg to extract every player text node → data/bracket-slots.json
 * 2. Injects rank-color fills into those text nodes → public/bracket-enhanced.svg
 *
 * SVG structure (per match):
 *   <svg x="25" y="90" width="300" height="110" viewBox="0 0 300 110">
 *     <g>
 *       <text x="12" y="38" fill="#BEC0C6" ...>PlayerName (#SEED)</text>  ← top player
 *       <text x="12" y="88" fill="#BEC0C6" ...>PlayerName (#SEED)</text>  ← bottom player
 *     </g>
 *   </svg>
 *
 * Key facts:
 * - Text content is in children[0].value of <text> nodes (NOT node.value)
 * - Absolute position = accumulated x/y of ancestor <svg> elements + text x/y
 * - Round determined by absolute x coordinate
 *
 * Run after fetch-ranks.ts (or init-players.ts):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/enhance-svg.ts
 */

import * as svgson from "svgson";
import * as fs from "fs";
import * as path from "path";
import type { PlayersJson, BracketSlot } from "../types/player";

const SVG_INPUT = path.resolve(__dirname, "../../bracket(36).svg");
const SVG_OUTPUT = path.resolve(__dirname, "../public/bracket-enhanced.svg");
const SLOTS_OUTPUT = path.resolve(__dirname, "../data/bracket-slots.json");
const PLAYERS_JSON = path.resolve(__dirname, "../data/players.json");

const SVG_WIDTH = 3550;
const ROUNDS = 8;
const COLUMN_WIDTH = SVG_WIDTH / ROUNDS; // ~444px per round column

const PLAYER_PATTERN = /^(.+?)\s+\(#(\d+)\)$/;

interface SvgNode {
  name: string;
  type: string;
  value: string;
  attributes: Record<string, string>;
  children: SvgNode[];
}

// Load player colors from players.json
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
const matchIndexByRound: Record<number, number> = {};

/**
 * Recursively walk the SVG tree.
 * absX/absY track the accumulated absolute position from all ancestor <svg> x/y attributes.
 */
function walkNode(node: SvgNode, absX: number, absY: number): void {
  let childAbsX = absX;
  let childAbsY = absY;

  // <svg> elements shift the coordinate origin for their subtree
  if (node.name === "svg") {
    childAbsX += parseFloat(node.attributes?.x ?? "0") || 0;
    childAbsY += parseFloat(node.attributes?.y ?? "0") || 0;
  }

  // Check <text> elements for player name pattern
  if (node.name === "text") {
    // Text content lives in child text nodes
    const textContent = (node.children ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.value)
      .join("")
      .trim();

    const match = textContent.match(PLAYER_PATTERN);
    if (match) {
      const seed = parseInt(match[2], 10);
      const textX = parseFloat(node.attributes?.x ?? "0") || 0;
      const textY = parseFloat(node.attributes?.y ?? "0") || 0;
      const absoluteX = childAbsX + textX;
      const absoluteY = childAbsY + textY;

      const round = Math.min(Math.max(Math.floor(absoluteX / COLUMN_WIDTH) + 1, 1), ROUNDS);
      matchIndexByRound[round] = (matchIndexByRound[round] ?? 0) + 1;
      const slotNum = matchIndexByRound[round];
      const matchIndex = Math.ceil(slotNum / 2);
      const position: "top" | "bottom" = slotNum % 2 === 1 ? "top" : "bottom";

      slots.push({ seed, round, matchIndex, position, x: Math.round(absoluteX), y: Math.round(absoluteY) });

      // Inject fill color directly onto the <text> element
      const color = seedToColor[seed];
      if (color) {
        node.attributes = { ...node.attributes, fill: color };
      }
    }
  }

  for (const child of node.children ?? []) {
    walkNode(child, childAbsX, childAbsY);
  }
}

async function main() {
  console.log("Reading SVG…");
  const svgRaw = fs.readFileSync(SVG_INPUT, "utf-8");

  console.log("Parsing SVG (may take a moment for a 1.1 MB file)…");
  const parsed = await svgson.parse(svgRaw, { camelcase: false }) as SvgNode;

  console.log("Extracting player slots and injecting colors…");
  walkNode(parsed, 0, 0);
  console.log(`Found ${slots.length} player slots.`);

  // Prepend a <style> block for CSS class-based tier colors
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

  // Write bracket-slots.json
  fs.mkdirSync(path.dirname(SLOTS_OUTPUT), { recursive: true });
  fs.writeFileSync(SLOTS_OUTPUT, JSON.stringify(slots, null, 2), "utf-8");
  console.log(`Wrote data/bracket-slots.json with ${slots.length} entries`);

  // Write enhanced SVG
  const enhanced = svgson.stringify(parsed as svgson.INode);
  fs.mkdirSync(path.dirname(SVG_OUTPUT), { recursive: true });
  fs.writeFileSync(SVG_OUTPUT, enhanced, "utf-8");
  console.log(`Wrote public/bracket-enhanced.svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
