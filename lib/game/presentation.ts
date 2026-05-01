import type {
  MatchResult,
  PlayerState,
  PublicRoomState,
  RoundResult,
  TeamState,
} from "@/lib/game/contracts";

export function getDisplayMode(mode: PublicRoomState["mode"]) {
  switch (mode) {
    case "solo":
      return "Solo Practice";
    case "duel":
      return "1v1 Match";
    case "team":
      return "Team Match";
    default:
      return "Match";
  }
}

export function getTeamById(room: PublicRoomState, teamId: TeamState["id"]) {
  return room.teams.find((team) => team.id === teamId) ?? null;
}

export function getPlayerById(room: PublicRoomState, playerId: string | null | undefined) {
  if (!playerId) {
    return null;
  }

  return room.players.find((player) => player.id === playerId) ?? null;
}

export function getResultCopy(result: MatchResult | null, mode?: string, myTeamId?: TeamState["id"]) {
  if (!result) {
    return {
      headline: "Match Complete",
      subline: "The result is being finalized.",
      tone: "neutral" as const,
    };
  }

  if (result.reason === "tie" || result.winnerTeamId === null) {
    return {
      headline: "Match Tied",
      subline: `Both sides finished on ${result.winningScore}.`,
      tone: "neutral" as const,
    };
  }

  const didWin = myTeamId === result.winnerTeamId;
  const marginLabel =
    result.marginType === "wickets"
      ? `${result.margin} wicket${result.margin === 1 ? "" : "s"}`
      : `${result.margin} run${result.margin === 1 ? "" : "s"}`;

  return {
    headline: didWin ? "Congratulations!" : "Hard Luck",
    subline: mode === "team" 
      ? (didWin ? `Victory by ${marginLabel}!` : `Defeat by ${marginLabel}.`)
      : (didWin ? "You dominated the match!" : "Great effort in the chase!"),
    tone: didWin ? ("success" as const) : ("danger" as const),
  };
}


export function getRoundHeadline(roundResult: RoundResult | null) {
  if (!roundResult) {
    return "Awaiting Ball";
  }

  if (roundResult.isOut) {
    return "OUT! Clean Bowled!";
  }

  if (roundResult.runs === 6) {
    return "Massive SIX!";
  }

  if (roundResult.runs === 4) {
    return "FOUR! Timed Sweetly!";
  }

  return `+${roundResult.runs} Runs`;
}

export function formatOvers(deliveries: number) {
  const completedOvers = Math.floor(deliveries / 6);
  const balls = deliveries % 6;
  return `${completedOvers}.${balls}`;
}

export function formatEconomy(runsConceded: number, deliveriesBowled: number) {
  if (deliveriesBowled === 0) {
    return "0.00";
  }

  return ((runsConceded * 6) / deliveriesBowled).toFixed(2);
}

export function formatStrikeRate(runsScored: number, deliveriesPlayed: number) {
  if (deliveriesPlayed === 0) {
    return "0.0";
  }

  return ((runsScored / deliveriesPlayed) * 100).toFixed(1);
}

export function getPlayerRoleLabel(args: {
  player: PlayerState;
  room: PublicRoomState;
}) {
  const { player, room } = args;
  if (room.innings?.currentBatterId === player.id) {
    return "Batter";
  }

  if (room.innings?.currentBowlerId === player.id) {
    return "Bowler";
  }

  return null;
}

export function getSwapSideCopy(mode: PublicRoomState["mode"]) {
  if (mode === "duel") {
    return "Change ends";
  }

  if (mode === "team") {
    return "Swap side";
  }

  return "Change side";
}
