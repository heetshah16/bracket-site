/**
 * enhance-svg.ts
 *
 * 1. Parses bracket(36).svg to extract every player text node → bracket-slots.json
 * 2. Injects rank-color fills into those text nodes → public/bracket-enhanced.svg
 *
 * Run after fetch-ranks.ts:
 *   npx ts-node -O '{"module":"commonjs"}' scripts/enhance-svg.ts
 */

import * as svgson from "svgson";
import * as fs from "fs";
import * as path from "path";
import type { PlayersJson, BracketSlot } from "../types/player";
import { buildSvgStyleBlock } from "../lib/rank-tiers";

const SVG_INPUT = path.resolve(__dirname, "../../bracket(36).svg");
const SVG_OUTPUT = path.resolve(__dirname, "../public/bracket-enhanced.svg");
const SLOTS_OUTPUT = path.resolve(__dirname, "../data/bracket-slots.json");
const PLAYERS_JSON = path.resolve(__dirname, "../data/players.json");

// SVG is 3550px wide with 8 rounds → each column ≈ 444px
const SVG_WIDTH = 3550;
const ROUNDS = 8;
const COLUMN_WIDTH = SVG_WIDTH / ROUNDS;

// Regex to extract "DisplayName (#SEED)" from text content
const PLAYER_PATTERN = /^(.+?)\s+\(#(\d+)\)$/;

interface SvgNode {
  name: string;
  type: string;
  value: string;
  attributes: Record<string, string>;
  children: SvgNode[];
}

/** Recursively resolve the absolute x position of a node by accumulating parent transforms */
function resolveX(node: SvgNode, inheritedX = 0): number {
  const x = parseFloat(node.attributes?.x ?? "0") || 0;
  const transform = node.attributes?.transform ?? "";
  const translateMatch = transform.match(/translate\(\s*([\d.+-]+)/);
  const tx = translateMatch ? parseFloat(translateMatch[1]) : 0;
  return inheritedX + tx + x;
}

function resolveY(node: SvgNode, inheritedY = 0): number {
  const y = parseFloat(node.attributes?.y ?? "0") || 0;
  const transform = node.attributes?.transform ?? "";
  const translateMatch = transform.match(/translate\(\s*[\d.+-]+\s*,\s*([\d.+-]+)/);
  const ty = translateMatch ? parseFloat(translateMatch[1]) : 0;
  return inheritedY + ty + y;
}

const slots: BracketSlot[] = [];
const seedToColor: Record<number, string> = {};
let matchCounter: Record<number, number> = {}; // per round match count

// Load players.json for color lookup
let playersData: PlayersJson | null = null;
if (fs.existsSync(PLAYERS_JSON)) {
  playersData = JSON.parse(fs.readFileSync(PLAYERS_JSON, "utf-8")) as PlayersJson;
  for (const [seed, p] of Object.entries(playersData.players)) {
    seedToColor[Number(seed)] = p.color;
  }
  console.log(`Loaded ${Object.keys(playersData.players).length} players from players.json`);
} else {
  console.warn("players.json not found — SVG will be enhanced without rank colors (run fetch-ranks.ts first)");
}

/** Walk the SVG tree, find player text nodes, collect slots, and inject fill colors */
function walkNode(node: SvgNode, parentX = 0, parentY = 0): void {
  const absX = resolveX(node, parentX);
  const absY = resolveY(node, parentY);

  if (node.name === "text" && node.value) {
    const match = node.value.trim().match(PLAYER_PATTERN);
    if (match) {
      const seed = parseInt(match[2], 10);
      const round = Math.min(Math.floor(absX / COLUMN_WIDTH) + 1, ROUNDS);

      matchCounter[round] = (matchCounter[round] ?? 0) + 1;
      const matchIndex = Math.ceil(matchCounter[round] / 2);
      const position: "top" | "bottom" = matchCounter[round] % 2 === 1 ? "top" : "bottom";

      slots.push({ seed, round, matchIndex, position, x: Math.round(absX), y: Math.round(absY) });

      // Inject fill color
      const color = seedToColor[seed];
      if (color) {
        node.attributes = node.attributes ?? {};
        node.attributes["fill"] = color;
      }
    }
  }

  for (const child of node.children ?? []) {
    walkNode(child, absX, absY);
  }
}

async function main() {
  console.log("Parsing SVG…");
  const svgRaw = fs.readFileSync(SVG_INPUT, "utf-8");
  const parsed = await svgson.parse(svgRaw) as SvgNode;

  matchCounter = {};
  walkNode(parsed, 0, 0);
  console.log(`Extracted ${slots.length} player slots across ${ROUNDS} rounds.`);

  // Save bracket-slots.json
  fs.mkdirSync(path.dirname(SLOTS_OUTPUT), { recursive: true });
  fs.writeFileSync(SLOTS_OUTPUT, JSON.stringify(slots, null, 2), "utf-8");
  console.log(`Wrote bracket-slots.json (${slots.length} slots)`);

  // Inject <style> block into SVG root's children
  const styleNode: SvgNode = {
    name: "style",
    type: "element",
    value: "",
    attributes: {},
    children: [
      {
        name: "",
        type: "text",
        value: buildSvgStyleBlock(),
        attributes: {},
        children: [],
      },
    ],
  };
  parsed.children.unshift(styleNode);

  // Serialize back to SVG string
  const enhanced = svgson.stringify(parsed as svgson.INode);
  fs.mkdirSync(path.dirname(SVG_OUTPUT), { recursive: true });
  fs.writeFileSync(SVG_OUTPUT, enhanced, "utf-8");
  console.log(`Wrote bracket-enhanced.svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
