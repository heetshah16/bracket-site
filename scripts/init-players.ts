/**
 * init-players.ts
 *
 * Quick setup script: reads the Excel file and writes data/players.json
 * with display names and Minecraft usernames — NO API calls.
 * All players get "unranked" tier (grey) until fetch-ranks.ts is run.
 *
 * Run this FIRST to make search work immediately:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/init-players.ts
 *
 * Then run fetch-ranks.ts to add actual ELO/tier data and re-run enhance-svg.ts.
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import type { PlayerData, PlayersJson } from "../types/player";

const EXCEL_PATH = path.resolve(__dirname, "../../EG_ FFA Public Player List.xlsx");
const OUTPUT_PATH = path.resolve(__dirname, "../data/players.json");

interface ExcelRow {
  Seed: number;
  "Display Name": string;
  "Minecraft Username": string;
  "Discord Username": string;
}

function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`Excel file not found at: ${EXCEL_PATH}`);
    process.exit(1);
  }

  console.log("Reading Excel file…");
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);
  console.log(`Found ${rows.length} rows.`);

  const players: Record<string, PlayerData> = {};

  for (const row of rows) {
    const seed = Number(row["Seed"]);
    if (!seed || isNaN(seed)) continue;

    const displayName = String(row["Display Name"] ?? "").trim();
    const mcUsername = String(row["Minecraft Username"] ?? "").trim();
    const discordUsername = String(row["Discord Username"] ?? "").trim();

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
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const output: PlayersJson = {
    fetchedAt: new Date().toISOString(),
    players,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Wrote ${Object.keys(players).length} players to data/players.json`);
  console.log("Run fetch-ranks.ts next to add ELO/rank data, then enhance-svg.ts for rank colors.");
}

main();
