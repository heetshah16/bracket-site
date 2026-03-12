"use client";

import { useState } from "react";
import type { PlayerData, PlayersJson, BracketSlot } from "@/types/player";
import dynamic from "next/dynamic";

// Lazy-load heavy components (avoid SSR issues with canvas / transform libs)
const BracketViewer = dynamic(() => import("@/components/BracketViewer"), { ssr: false });
const SearchBar = dynamic(() => import("@/components/SearchBar"), { ssr: false });

// These JSON files are bundled at build time.
// Run scripts/fetch-ranks.ts and scripts/enhance-svg.ts first to generate them.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const playersJson = (require("@/data/players.json") as PlayersJson);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bracketSlots = (require("@/data/bracket-slots.json") as BracketSlot[]);


export default function Home() {
  const [highlightSeed, setHighlightSeed] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handleSelectPlayer(player: PlayerData) {
    setHighlightSeed(player.seed);
  }

  const playerCount = Object.keys(playersJson.players).length;

  return (
    <main className="flex h-screen overflow-hidden relative">
      {/* Sidebar — search panel */}
      <aside
        className="flex flex-col shrink-0 z-10 transition-all duration-300"
        style={{
          width: sidebarOpen ? 380 : 0,
          minWidth: sidebarOpen ? 380 : 0,
          backgroundColor: "rgba(11, 13, 19, 0.85)",
          borderRight: sidebarOpen ? "1px solid #22293B" : "none",
          backdropFilter: "blur(8px)",
          overflow: "hidden",
        }}
      >
        <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
          {/* Header */}
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "#BEC0C6" }}>
              EG FFA Tournament
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
              {playerCount} players · Single Elimination
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <SearchBar playersJson={playersJson} bracketSlots={bracketSlots} onSelectPlayer={handleSelectPlayer} />
          </div>
        </div>
      </aside>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute top-4 z-20 w-6 h-12 flex items-center justify-center rounded-r transition-all duration-300"
        style={{
          left: sidebarOpen ? 380 : 0,
          backgroundColor: "#2F3648",
          border: "1px solid #22293B",
          borderLeft: "none",
          color: "#BEC0C6",
          fontSize: 18,
        }}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? "‹" : "›"}
      </button>

      {/* Bracket viewer — fills remaining space */}
      <div className="flex-1 relative">
        <BracketViewer slots={bracketSlots} highlightSeed={highlightSeed} />
      </div>
    </main>
  );
}
