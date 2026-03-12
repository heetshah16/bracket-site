"use client";

import { useState, useRef, useEffect } from "react";
import type { PlayerData, PlayersJson, ProjectedOpponent } from "@/types/player";
import { getProjectedOpponents } from "@/lib/bracket-logic";
import PlayerCard from "./PlayerCard";
import MatchPreview from "./MatchPreview";

interface SearchBarProps {
  playersJson: PlayersJson;
  onSelectPlayer: (player: PlayerData) => void;
}

export default function SearchBar({ playersJson, onSelectPlayer }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerData[]>([]);
  const [selected, setSelected] = useState<PlayerData | null>(null);
  const [projections, setProjections] = useState<ProjectedOpponent[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allPlayers = Object.values(playersJson.players);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const q = query.toLowerCase();
    const filtered = allPlayers
      .filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.mcUsername.toLowerCase().includes(q)
      )
      .slice(0, 10);
    setResults(filtered);
    setShowDropdown(filtered.length > 0);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
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
    const projs = getProjectedOpponents(player.seed);
    setProjections(projs);
    onSelectPlayer(player);
  }

  function getOpponent(opponentSeed: number): PlayerData | null {
    return playersJson.players[opponentSeed] ?? null;
  }

  return (
    <div className="w-full max-w-md">
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search your name…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: "#141822",
            border: "1px solid #22293B",
            color: "#BEC0C6",
          }}
        />
        {query && (
          <button
            className="absolute inset-y-0 right-3 flex items-center"
            onClick={() => { setQuery(""); setSelected(null); setProjections([]); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full max-w-md mt-1 rounded-lg overflow-hidden shadow-xl"
          style={{ backgroundColor: "#141822", border: "1px solid #22293B" }}
        >
          {results.map((p) => (
            <button
              key={p.seed}
              className="w-full text-left px-3 py-2 hover:bg-[#1e2535] transition-colors"
              onClick={() => selectPlayer(p)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: "#6B7280" }}>#{p.seed}</span>
                <span className="text-sm font-medium" style={{ color: "#BEC0C6" }}>{p.displayName}</span>
                <span className="text-xs ml-auto" style={{ color: p.color }}>{p.tier}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected player result panel */}
      {selected && projections.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Selected player header */}
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: "#141822", border: "1px solid #22293B" }}
          >
            <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#6B7280" }}>
              Your bracket position
            </div>
            <PlayerCard player={selected} isSearchResult />
          </div>

          {/* Projected opponents */}
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
            Projected opponents
          </div>
          {projections.map((proj) => (
            <MatchPreview
              key={proj.round}
              player={selected}
              opponent={proj.isBye ? null : getOpponent(proj.opponentSeed)}
              projection={proj}
            />
          ))}
        </div>
      )}
    </div>
  );
}
