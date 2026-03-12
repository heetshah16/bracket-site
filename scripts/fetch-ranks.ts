/**
 * fetch-ranks.ts
 *
 * Reads EG_ FFA Public Player List.xlsx, calls the MCSR Ranked API for each
 * player's ELO, and writes data/players.json.
 *
 * Run once before deploying:
 *   npx ts-node --esm scripts/fetch-ranks.ts
 *   OR
 *   npx ts-node -O '{"module":"commonjs"}' scripts/fetch-ranks.ts
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { getTierFromElo } from "../lib/rank-tiers";
import type { PlayerData, PlayersJson } from "../types/player";

const EXCEL_PATH = path.resolve(__dirname, "../../EG_ FFA Public Player List.xlsx");
const OUTPUT_PATH = path.resolve(__dirname, "../data/players.json");
const MCSR_API = "https://api.mcsrranked.com/users";
// Stay well under the 500 req/10min rate limit (~40 req/min)
const DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ExcelRow {
  Seed: number;
  "Display Name": string;
  "Minecraft Username": string;
  "Discord Username": string;
}

async function fetchPlayerData(mcUsername: string): Promise<{ elo: number | null; uuid: string | null }> {
  try {
    const res = await fetch(`${MCSR_API}/${encodeURIComponent(mcUsername)}`, {
      headers: { "User-Agent": "eg-ffa-bracket-site/1.0" },
    });
    if (!res.ok) return { elo: null, uuid: null };
    const json = await res.json() as {
      data?: { eloRate?: number | null; uuid?: string };
    };
    return {
      elo: json.data?.eloRate ?? null,
      uuid: json.data?.uuid ?? null,
    };
  } catch {
    return { elo: null, uuid: null };
  }
}

async function main() {
  // Parse Excel
  console.log("Reading Excel file…");
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);
  console.log(`Found ${rows.length} players.`);

  const players: Record<string, PlayerData> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const seed = Number(row["Seed"]);
    const displayName = String(row["Display Name"] ?? "").trim();
    const mcUsername = String(row["Minecraft Username"] ?? "").trim();
    const discordUsername = String(row["Discord Username"] ?? "").trim();

    if (!mcUsername) {
      console.warn(`  Seed ${seed} (${displayName}) has no Minecraft username — skipping API call.`);
      players[seed] = {
        seed,
        displayName,
        mcUsername,
        discordUsername,
        elo: null,
        tier: "unranked",
        color: "#555555",
        found: false,
      };
      continue;
    }

    process.stdout.write(`  [${i + 1}/${rows.length}] ${mcUsername}… `);
    const { elo, uuid } = await fetchPlayerData(mcUsername);
    const tier = getTierFromElo(elo);

    players[seed] = {
      seed,
      displayName,
      mcUsername,
      discordUsername,
      elo,
      tier: tier.name,
      color: tier.color,
      found: uuid !== null,
    };

    console.log(elo !== null ? `ELO ${elo} (${tier.label})` : "not found");
    await sleep(DELAY_MS);
  }

  // Ensure data directory exists
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const output: PlayersJson = {
    fetchedAt: new Date().toISOString(),
    players,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nWrote ${Object.keys(players).length} players to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
