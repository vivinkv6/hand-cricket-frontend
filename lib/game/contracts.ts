export const GAME_EVENTS = {
  CREATE_ROOM: "CREATE_ROOM",
  JOIN_ROOM: "JOIN_ROOM",
  REJOIN_ROOM: "REJOIN_ROOM",
  START_GAME: "START_GAME",
  SELECT_TOSS: "SELECT_TOSS",
  SELECT_NUMBER: "SELECT_NUMBER",
  SELECT_BOWLER: "SELECT_BOWLER",
  ROUND_RESULT: "ROUND_RESULT",
  SWITCH_INNINGS: "SWITCH_INNINGS",
  GAME_STATE_UPDATE: "GAME_STATE_UPDATE",
  GAME_OVER: "GAME_OVER",
  REMATCH_REQUEST: "REMATCH_REQUEST",
  TEAM_SWAP: "TEAM_SWAP",
  PLAYER_DISCONNECTED: "PLAYER_DISCONNECTED",
  PLAYER_RECONNECTED: "PLAYER_RECONNECTED",
  RENAME_TEAM: "RENAME_TEAM",
  ERROR: "ERROR",
} as const;

export const SOUNDS = {
  HOME_MUSIC: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  BAT_HIT: "https://assets.mixkit.co/active_storage/sfx/2288/2288-preview.mp3",
  CHEER_SMALL: "https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3",
  CHEER_BIG: "https://assets.mixkit.co/active_storage/sfx/2043/2043-preview.mp3",
  WICKET: "https://assets.mixkit.co/active_storage/sfx/2186/2186-preview.mp3",
  CLICK: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  SIX_COMMENTARY: "https://assets.mixkit.co/active_storage/sfx/2045/2045-preview.mp3",
  WIN: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
  LOSS: "https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3",
} as const;

export type GameMode = "solo" | "duel" | "team";
export type TeamId = "A" | "B";
export type GameStatus =
  | "waiting"
  | "ready"
  | "toss"
  | "live"
  | "inningsBreak"
  | "completed";
export type TossChoice = "bat" | "bowl";

export interface TossState {
  winnerTeamId: TeamId;
  decisionMakerId: string;
  choice: TossChoice | null;
}

export interface PlayerState {
  id: string;
  socketId: string | null;
  name: string;
  teamId: TeamId;
  connected: boolean;
  isBot: boolean;
  isCaptain: boolean;
  runsScored: number;
  runsConceded: number;
  wicketsTaken: number;
  deliveriesPlayed: number;
  deliveriesBowled: number;
  currentSelection: number | null;
}

export interface TeamState {
  id: TeamId;
  name: string;
  playerIds: string[];
  captainId: string | null;
  score: number;
  wickets: number;
}

export interface RoundResult {
  batterId: string;
  bowlerId: string;
  batterNumber: number;
  bowlerNumber: number;
  runs: number;
  isOut: boolean;
  label: string;
  deliveryNumber: number;
  battingTeamId: TeamId;
}

export interface InningsState {
  number: 1 | 2;
  battingTeamId: TeamId;
  bowlingTeamId: TeamId;
  currentBatterId: string | null;
  currentBowlerId: string | null;
  currentSpellBalls: number;
  pendingBowlerSelection: boolean;
}

export interface MatchResult {
  winnerTeamId: TeamId | null;
  loserTeamId: TeamId | null;
  reason: "allOut" | "chaseComplete" | "tie";
  margin: number;
  marginType: "runs" | "wickets" | "tie";
  winningScore: number;
  losingScore: number;
}

export interface PublicRoomState {
  id: string;
  mode: GameMode;
  status: GameStatus;
  teamSize: number;
  maxPlayers: number;
  players: PlayerState[];
  teams: TeamState[];
  toss: TossState | null;
  innings: InningsState | null;
  targetScore: number | null;
  currentTurn: number;
  lastRoundResult: RoundResult | null;
  rematchVotes: Record<string, "same" | "swap">;
  result: MatchResult | null;
  createdAt: string;
  updatedAt: string;
  lastActionAt: string;
  awaitingPlayerIds: string[];
}

export interface SessionState {
  roomId: string;
  playerId: string;
  playerName: string;
}
