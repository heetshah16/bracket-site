export interface PlayerData {
  seed: number;
  displayName: string;
  mcUsername: string;
  discordUsername: string;
  elo: number | null;
  tier: string;
  color: string;
  found: boolean;
}

export interface PlayersJson {
  fetchedAt: string;
  players: Record<string, PlayerData>;
}

export interface BracketSlot {
  seed: number;
  round: number;
  matchIndex: number;
  position: "top" | "bottom";
  x: number;
  y: number;
}

export interface ProjectedOpponent {
  round: 1 | 2 | 3;
  opponentSeed: number;
  isBye: boolean;
}

export interface H2HResult {
  p1: string;
  p2: string;
  p1Wins: number;
  p2Wins: number;
  totalMatches: number;
  statsUrl: string;
  noData?: boolean;
  cached?: boolean;
}
