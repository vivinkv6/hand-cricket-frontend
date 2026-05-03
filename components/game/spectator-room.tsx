"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AudioControls } from "@/components/shared/audio-controls";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import type { PublicRoomState, RoundResult } from "@/lib/game/contracts";
import {
  formatOvers,
  getPlayerById,
  getTeamById,
  getResultCopy,
} from "@/lib/game/presentation";

const pulseVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

export function SpectatorRoom({
  room,
  connected,
  error,
  roundResult,
}: {
  room: PublicRoomState;
  connected: boolean;
  error: string;
  roundResult: RoundResult | null;
}) {
  const [showResultModal, setShowResultModal] = useState(false);
  const innings = room.innings;
  const battingTeam = innings ? getTeamById(room, innings.battingTeamId) : null;
  const bowlingTeam = innings ? getTeamById(room, innings.bowlingTeamId) : null;
  const striker = getPlayerById(room, innings?.currentBatterId);
  const bowler = getPlayerById(room, innings?.currentBowlerId);
  const resultCopy = getResultCopy(room.result, room.mode);
  const recentBalls = [...(room.ballHistory ?? [])].slice(-12).reverse();
  const overs = buildOvers(room.ballHistory ?? []);
  const showMOM =
    room.mode === "team" &&
    room.status === "completed" &&
    !room.players.some((player) => player.isBot) &&
    Boolean(room.result?.winnerTeamId);
  const momCandidate = showMOM
    ? [...room.players].sort((a, b) => {
        const scoreA = a.runsScored + a.wicketsTaken * 20;
        const scoreB = b.runsScored + b.wicketsTaken * 20;
        return scoreB - scoreA;
      })[0]
    : null;
  const broadcastMood = roundResult?.isOut
    ? "Breakthrough moment on the field."
    : roundResult?.runs === 6
      ? "Momentum swings sharply after the maximum."
      : roundResult?.runs === 4
        ? "Boundary pressure building through this over."
        : connected
          ? "Live coverage is flowing smoothly."
          : "Signal dipped, syncing the broadcast.";
  const winnerTeam =
    room.result?.winnerTeamId ? getTeamById(room, room.result.winnerTeamId) : null;
  useSoundEffects({
    roundResult,
    result: room.result,
  });

  useEffect(() => {
    if (room.status === "completed") {
      setShowResultModal(true);
      return;
    }

    setShowResultModal(false);
  }, [room.status, room.updatedAt]);

  return (
    <main className="stadium-shell min-h-screen px-4 py-6 text-white">
      <div className="broadcast-stage mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-[2.5rem] p-2">
        <motion.section
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="glass-panel highlight-shell rounded-[2rem] p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="broadcast-label text-primary">Spectator Broadcast</span>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                    connected
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {connected ? "Live Sync" : "Recovering Feed"}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">
                  {room.spectatorCount} watching
                </span>
              </div>
              <div>
                <h1 className="broadcast-title text-4xl text-white sm:text-5xl">Room {room.id}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  {innings
                    ? `${battingTeam?.name} are on strike against ${bowlingTeam?.name}. ${broadcastMood}`
                    : room.status === "completed"
                      ? resultCopy.subline
                      : "Waiting for the live match to begin."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-[minmax(140px,1fr)_minmax(180px,1.25fr)_minmax(140px,1fr)_minmax(140px,1fr)]">
              <StatCard label="Status" value={room.status} accent="text-primary" />
              <StatCard
                label="Score"
                value={battingTeam ? `${battingTeam.score}/${battingTeam.wickets}` : "--"}
                valueClassName="text-2xl sm:text-[1.7rem]"
              />
              <StatCard label="Overs" value={formatOvers(room.currentTurn)} />
              <StatCard label="Target" value={room.targetScore ? String(room.targetScore) : "--"} />
            </div>
          </div>
        </motion.section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <motion.div
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.08 }}
            className="glass-panel rounded-[2rem] p-6"
          >
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(140deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="broadcast-label text-slate-400">Live Scoreboard</div>
                      <div className="mt-3 flex items-end gap-3">
                        <h2 className="broadcast-title text-4xl text-white sm:text-5xl">
                          {battingTeam?.score ?? 0}/{battingTeam?.wickets ?? 0}
                        </h2>
                        <span className="pb-2 text-sm uppercase tracking-[0.18em] text-slate-400">
                          {battingTeam?.name ?? "Waiting"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        {innings
                          ? `Over ${room.gameState.currentOver}.${Math.max(room.gameState.currentBall - 1, 0)} • ${bowlingTeam?.name} hunting a breakthrough`
                          : "No innings active yet."}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-right">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-sky-200">Match Phase</div>
                      <div className="mt-2 text-2xl font-black text-white">
                        {room.status === "completed"
                          ? "Complete"
                          : innings
                            ? `Innings ${innings.number}`
                            : "Pre-game"}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={roundResult ? `${roundResult.inningsNumber}-${roundResult.deliveryNumber}` : "idle"}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.95 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={`relative mt-5 overflow-hidden rounded-[1.5rem] border p-5 ${
                        roundResult?.isOut
                          ? "border-rose-400/35 bg-rose-500/15"
                          : roundResult?.runs === 6
                            ? "border-orange-400/35 bg-orange-500/15"
                            : "border-primary/25 bg-primary/10"
                      }`}
                    >
                      <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />
                      <div className="relative">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-100/80">
                          {roundResult ? "Current highlight" : "Broadcast note"}
                        </div>
                        <div className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                          {roundResult ? roundResult.label : connected ? "Feed locked in" : "Rejoining stream"}
                        </div>
                        <div className="mt-3 text-sm text-slate-100/85">
                          {roundResult
                            ? getHighlightSubline({
                                batterName:
                                  getPlayerById(room, roundResult.batterId)?.name ?? "Batter",
                                bowlerName:
                                  getPlayerById(room, roundResult.bowlerId)?.name ?? "Bowler",
                                label: roundResult.label,
                                isOut: roundResult.isOut,
                                runs: roundResult.runs,
                              })
                            : "Updates will animate here as each ball lands."}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PlayerSpotlight
                    title="Striker"
                    playerName={striker?.name ?? "Waiting"}
                    subtitle={
                      striker
                        ? `${striker.runsScored} runs from ${striker.deliveriesPlayed} balls`
                        : "No batter in position"
                    }
                    accent="from-emerald-500/30 to-transparent"
                    icon="🏏"
                  />
                  <PlayerSpotlight
                    title="Bowler"
                    playerName={bowler?.name ?? "Waiting"}
                    subtitle={
                      bowler
                        ? `${bowler.wicketsTaken} wickets • ${bowler.runsConceded} conceded`
                        : "No bowler selected"
                    }
                    accent="from-sky-500/30 to-transparent"
                    icon="⚾"
                  />
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="broadcast-title text-2xl text-white">Ball History</h2>
                  {room.status === "completed" ? (
                    <Link
                      href={`/replay/${room.id}?returnTo=spectate`}
                      className="rounded-full border border-primary/35 bg-primary px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950"
                    >
                      Open Replay
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 max-h-[34rem] space-y-4 overflow-y-auto pr-1 no-scrollbar">
                  {overs.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">
                      Ball-by-ball highlights will start here once the innings goes live.
                    </div>
                  ) : (
                    overs.map((over, index) => (
                      <motion.div
                        key={`${over.inningsNumber}-${over.overNumber}`}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.28 }}
                        className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-white">
                              Innings {over.inningsNumber} • Over {over.overNumber}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200 whitespace-nowrap">
                            <span>{over.totalRuns}R</span>
                            {over.wickets > 0 ? <span>{over.wickets}W</span> : null}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {Array.from({ length: 6 }).map((_, ballIndex) => {
                            const ball = over.balls[ballIndex];
                            const isActive =
                              ball &&
                              roundResult &&
                              roundResult.inningsNumber === ball.inningsNumber &&
                              roundResult.deliveryNumber === ball.deliveryNumber;

                            return (
                              <div key={`${over.inningsNumber}-${over.overNumber}-${ballIndex}`} className="flex flex-col items-center gap-2">
                                <div
                                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-black transition-all ${
                                    !ball
                                      ? "border-white/8 bg-transparent text-slate-700"
                                      : ball.isOut
                                        ? "border-rose-400 bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.28)]"
                                        : ball.runs >= 4
                                          ? "border-orange-300 bg-orange-500/85 text-white shadow-[0_0_18px_rgba(249,115,22,0.24)]"
                                          : isActive
                                            ? "border-primary bg-primary/20 text-primary shadow-[0_0_18px_rgba(250,204,21,0.24)]"
                                            : "border-white/12 bg-white/10 text-white"
                                  }`}
                                  title={
                                    ball
                                      ? `${getPlayerById(room, ball.batterId)?.name ?? "Batter"} vs ${getPlayerById(room, ball.bowlerId)?.name ?? "Bowler"}`
                                      : "Ball pending"
                                  }
                                >
                                  {ball ? (ball.isOut ? "W" : ball.runs) : ""}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                  {ballIndex + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.14 }}
            className="glass-panel rounded-[2rem] p-6"
          >
            <h2 className="broadcast-title text-2xl text-white">Player Grid</h2>
            <div className="mt-4 space-y-4">
              {room.teams.map((team) => (
                <div key={team.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-black text-white">{team.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                        {team.score}/{team.wickets}
                      </div>
                    </div>
                    <div className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                      {room.players.filter((player) => player.teamId === team.id).length} players
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {room.players
                      .filter((player) => player.teamId === team.id)
                      .map((player) => (
                        <div
                          key={player.id}
                          className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-white">{player.name}</div>
                              <div className="mt-1 text-xs text-slate-400">
                                {player.runsScored}({player.deliveriesPlayed}) • {player.wicketsTaken}/{player.runsConceded}
                              </div>
                            </div>
                            <div
                              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                                player.connected
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-rose-500/15 text-rose-300"
                              }`}
                            >
                              {player.connected ? "Live" : "Offline"}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {error ? (
          <div className="rounded-[1.4rem] border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {showResultModal && room.status === "completed" ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResultModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="glass-panel relative z-10 w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-primary/25 p-8 text-center"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <div className="broadcast-label text-primary">Match Result</div>
              <h2 className="broadcast-title mt-4 text-4xl text-white sm:text-5xl">
                {winnerTeam ? `${winnerTeam.name} Wins` : "Match Tied"}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                {winnerTeam
                  ? `${winnerTeam.name} have taken this match. ${resultCopy.subline}`
                  : resultCopy.subline}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {room.teams.map((team) => (
                  <div key={team.id} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 text-left">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      {team.name}
                    </div>
                    <div className="mt-3 text-3xl font-black text-white">
                      {team.score}/{team.wickets}
                    </div>
                  </div>
                ))}
              </div>

              {momCandidate ? (
                <div className="mt-6 rounded-[1.6rem] border border-primary/25 bg-primary/10 p-5 text-center">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                    Man of the Match
                  </div>
                  <div className="mt-3 text-3xl font-black text-white">
                    {momCandidate.name}
                  </div>
                  <div className="mt-2 text-sm text-slate-200">
                    {momCandidate.runsScored} runs • {momCandidate.wicketsTaken} wickets
                  </div>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/replay/${room.id}?returnTo=spectate`}
                  className="rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950"
                >
                  Watch Highlights
                </Link>
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="fixed bottom-8 right-6 z-[120]">
        <AudioControls />
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
  valueClassName,
}: {
  label: string;
  value: string;
  accent?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div
        className={`mt-2 truncate font-black capitalize text-white ${valueClassName ?? "text-lg"} ${accent ?? ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function PlayerSpotlight({
  title,
  playerName,
  subtitle,
  accent,
  icon,
}: {
  title: string;
  playerName: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div className={`rounded-[1.5rem] border border-white/10 bg-gradient-to-br ${accent} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">{title}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white">
          <span className="text-xl leading-none">{icon}</span>
        </div>
      </div>
      <div className="mt-2 text-2xl font-black text-white">{playerName}</div>
      <div className="mt-2 text-sm text-slate-200">{subtitle}</div>
    </div>
  );
}

function getHighlightSubline(args: {
  batterName: string;
  bowlerName: string;
  label: string;
  isOut: boolean;
  runs: number;
}) {
  if (args.isOut) {
    return `${args.bowlerName} breaks through and sends ${args.batterName} back.`;
  }

  if (args.runs === 6) {
    return `${args.batterName} launches one into the stands for a huge finish.`;
  }

  if (args.runs === 4) {
    return `${args.batterName} pierces the field and races away to the rope.`;
  }

  if (args.runs <= 1) {
    return `${args.batterName} keeps the innings moving while ${args.bowlerName} stays disciplined.`;
  }

  return `${args.batterName} keeps the pressure on with another sharp scoring stroke.`;
}

type OverGroup = {
  inningsNumber: number;
  overNumber: number;
  balls: RoundResult[];
  totalRuns: number;
  wickets: number;
};

function buildOvers(history: RoundResult[]): OverGroup[] {
  const map = new Map<string, OverGroup>();

  for (const ball of history) {
    const key = `${ball.inningsNumber}-${ball.overNumber}`;
    const existing = map.get(key);

    if (existing) {
      existing.balls.push(ball);
      existing.totalRuns += ball.runs;
      existing.wickets += ball.isOut ? 1 : 0;
      continue;
    }

    map.set(key, {
      inningsNumber: ball.inningsNumber,
      overNumber: ball.overNumber,
      balls: [ball],
      totalRuns: ball.runs,
      wickets: ball.isOut ? 1 : 0,
    });
  }

  return [...map.values()]
    .map((over) => ({
      ...over,
      balls: [...over.balls].sort((a, b) => a.ballInOver - b.ballInOver),
    }))
    .sort((a, b) => {
      if (a.inningsNumber !== b.inningsNumber) {
        return b.inningsNumber - a.inningsNumber;
      }

      return b.overNumber - a.overNumber;
    });
}
