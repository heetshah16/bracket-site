"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { PlayerData, PlayersJson, BracketSlot, ProjectedOpponent } from "@/types/player";
import { getProjectedOpponents } from "@/lib/bracket-logic";
import PlayerCard from "./PlayerCard";
import MatchPreview from "./MatchPreview";

interface SearchBarProps {
  playersJson: PlayersJson;
  bracketSlots: BracketSlot[];
  onSelectPlayer: (player: PlayerData) => void;
}

export default function SearchBar({ playersJson, bracketSlots, onSelectPlayer }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerData[]>([]);
  const [selected, setSelected] = useState<PlayerData | null>(null);
  const [projections, setProjections] = useState<ProjectedOpponent[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const allPlayers = Object.values(playersJson.players);

  const runSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim().toLowerCase();
      if (trimmed.length === 0) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
      const filtered = allPlayers
        .filter(
          (p) =>
            p.displayName.toLowerCase().includes(trimmed) ||
            p.mcUsername.toLowerCase().includes(trimmed)
        )
        .slice(0, 10);
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    },
    // allPlayers is derived from playersJson which is a stable prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playersJson]
  );

  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectPlayer(player: PlayerData) {
    setSelected(player);
    setQuery(player.displayName);
    setShowDropdown(false);
    setProjections(getProjectedOpponents(player.seed, bracketSlots));
    onSelectPlayer(player);
  }

  function clearSearch() {
    setQuery("");
    setSelected(null);
    setProjections([]);
    setResults([]);
    setShowDropdown(false);
  }

  function getOpponent(opponentSeed: number): PlayerData | null {
    return playersJson.players[opponentSeed] ?? null;
  }

  const playerCount = allPlayers.length;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Search input — container is relative so dropdown anchors to it */}
      <div className="relative" ref={containerRef}>
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder={
            playerCount > 0
              ? `Search ${playerCount} players…`
              : "Run npm run setup first…"
          }
          disabled={playerCount === 0}
          className="w-full pl-9 pr-8 py-2.5 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: "#141822",
            border: "1px solid #22293B",
            color: "#BEC0C6",
            caretColor: "#BEC0C6",
          }}
        />

        {query && (
          <button
            className="absolute inset-y-0 right-2.5 flex items-center px-1 opacity-60 hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.preventDefault(); clearSearch(); }}
            aria-label="Clear search"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#BEC0C6" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Dropdown — anchored to input */}
        {showDropdown && results.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-2xl"
            style={{
              backgroundColor: "#141822",
              border: "1px solid #22293B",
              zIndex: 9999,
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {results.map((p) => (
              <button
                key={p.seed}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2"
                style={{ borderBottom: "1px solid #22293B40" }}
                onMouseDown={(e) => { e.preventDefault(); selectPlayer(p); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#1e2535"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
              >
                <span
                  className="text-xs font-mono shrink-0 rounded px-1 py-0.5"
                  style={{ backgroundColor: "#22293B", color: "#6B7280" }}
                >
                  #{p.seed}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: "#BEC0C6" }}>
                  {p.displayName}
                </span>
                {p.mcUsername && p.mcUsername !== p.displayName && (
                  <span className="text-xs truncate flex-1" style={{ color: "#6B7280" }}>
                    {p.mcUsername}
                  </span>
                )}
                <span
                  className="text-xs ml-auto shrink-0 font-semibold capitalize"
                  style={{ color: p.color }}
                >
                  {p.tier}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result panel for the selected player */}
      {selected && (
        <div className="flex flex-col gap-3">
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: "#141822", border: "1px solid #22293B" }}
          >
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#6B7280" }}>
              Your bracket slot
            </p>
            <PlayerCard player={selected} isSearchResult />
          </div>

          {projections.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
                Projected opponents
              </p>
              {projections.map((proj) => (
                <MatchPreview
                  key={proj.round}
                  player={selected}
                  opponent={proj.isBye ? null : getOpponent(proj.opponentSeed)}
                  projection={proj}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
