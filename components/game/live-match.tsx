"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  PlayerState,
  PublicRoomState,
  RoundResult,
  TeamId,
} from "@/lib/game/contracts";
import {
  formatEconomy,
  formatOvers,
  formatStrikeRate,
  getPlayerById,
  getPlayerRoleLabel,
  getRoundHeadline,
  getTeamById,
} from "@/lib/game/presentation";

type RoomActions = {
  selectNumber: (number: number) => Promise<void>;
  selectBowler: (bowlerId: string) => Promise<void>;
};

export function LiveMatch({
  room,
  me,
  connected,
  error,
  roundResult,
  playClick,
  actions,
}: {
  room: PublicRoomState;
  me: PlayerState;
  connected: boolean;
  error: string;
  roundResult: RoundResult | null;
  playClick: () => void;
  actions: RoomActions;
}) {
  const innings = room.innings;
  const myTeam = getTeamById(room, me.teamId)!;
  const rivalTeam = room.teams.find((team) => team.id !== me.teamId)!;
  const battingTeam = innings ? getTeamById(room, innings.battingTeamId) : null;
  const bowlingTeam = innings ? getTeamById(room, innings.bowlingTeamId) : null;
  const activeBatter = getPlayerById(room, innings?.currentBatterId);
  const activeBowler = getPlayerById(room, innings?.currentBowlerId);
  const requiredRuns =
    room.targetScore && battingTeam ? Math.max(room.targetScore - battingTeam.score, 0) : null;
  const [expandedPlayersByTeam, setExpandedPlayersByTeam] = useState<
    Partial<Record<TeamId, string | null>>
  >({});

  useEffect(() => {
    if (!innings) {
      return;
    }

    setExpandedPlayersByTeam({
      [innings.battingTeamId]: innings.currentBatterId,
      [innings.bowlingTeamId]: innings.currentBowlerId,
    });
  }, [
    innings?.battingTeamId,
    innings?.bowlingTeamId,
    innings?.currentBatterId,
    innings?.currentBowlerId,
  ]);

  const canChooseBowler = Boolean(
    innings &&
      innings.pendingBowlerSelection &&
      me.isCaptain &&
      me.teamId === innings.bowlingTeamId &&
      room.mode === 'team',
  );
  const isMyTurn = room.awaitingPlayerIds.includes(me.id);
  const canSelectNumbers = Boolean(
    room.status === "live" &&
      innings &&
      !innings.pendingBowlerSelection &&
      [innings.currentBatterId, innings.currentBowlerId].includes(me.id) &&
      me.currentSelection === null,
  );

  const matchPulse = (() => {
    if (canChooseBowler) {
      return "Captain, choose the bowler";
    }

    if (isMyTurn) {
      return innings?.currentBatterId === me.id ? "Your shot" : "Your delivery";
    }

    return room.mode === "solo" ? "Bot is on the move" : "Live play in progress";
  })();

  const renderTeamColumn = (teamId: TeamId, accentClass: string) => {
    const team = getTeamById(room, teamId)!;
    const roster = room.players.filter((player) => player.teamId === teamId);
    const allowBowlerChoice = canChooseBowler && me.teamId === team.id && room.mode === "team";
    const expandedPlayerId = expandedPlayersByTeam[team.id];

    return (
      <section className="glass-panel rounded-[1.8rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`broadcast-title text-3xl ${accentClass}`}>{team.name}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              {team.score}/{team.wickets}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
              innings?.battingTeamId === team.id
                ? "bg-emerald-500/18 text-emerald-100"
                : "bg-sky-500/18 text-sky-100"
            }`}
          >
            {innings?.battingTeamId === team.id ? "Batting" : "Bowling"}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {roster.map((player) => {
            const awaiting = room.awaitingPlayerIds.includes(player.id);
            const role = getPlayerRoleLabel({ player, room });
            const isExpanded = expandedPlayerId === player.id;

            return (
              <motion.div
                key={player.id}
                layout
                className={`rounded-[1.45rem] border px-4 py-4 ${
                  awaiting
                    ? "border-indigo-300/45 bg-indigo-500/10"
                    : "border-white/10 bg-black/18"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPlayersByTeam((current) => ({
                      ...current,
                      [team.id]: current[team.id] === player.id ? null : player.id,
                    }))
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {player.name} {player.id === me.id ? "(You)" : ""}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {role ?? "Squad"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {player.isCaptain ? (
                      <span className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                        Captain
                      </span>
                    ) : null}
                    {!player.connected ? (
                      <span className="rounded-full bg-rose-500/18 px-3 py-1 text-xs uppercase tracking-[0.18em] text-rose-100">
                        Offline
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/12 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                      {isExpanded ? "Hide" : "View"}
                    </span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Runs</p>
                          <p className="mt-1 font-semibold text-white">{player.runsScored}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Balls</p>
                          <p className="mt-1 font-semibold text-white">{player.deliveriesPlayed}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Strike Rate</p>
                          <p className="mt-1 font-semibold text-white">
                            {formatStrikeRate(player.runsScored, player.deliveriesPlayed)}
                          </p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Overs</p>
                          <p className="mt-1 font-semibold text-white">
                            {formatOvers(player.deliveriesBowled)}
                          </p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Wickets</p>
                          <p className="mt-1 font-semibold text-white">{player.wicketsTaken}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Economy</p>
                          <p className="mt-1 font-semibold text-white">
                            {formatEconomy(player.runsConceded, player.deliveriesBowled)}
                          </p>
                        </div>
                      </div>

                      {allowBowlerChoice && !player.isBot && room.mode === "team" ? (
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            void actions.selectBowler(player.id);
                          }}
                          className="mt-4 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-indigo-300/50"
                        >
                          Choose Bowler
                        </button>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <main className="stadium-shell relative min-h-screen overflow-hidden px-4 py-5 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="glass-panel rounded-[1.9rem] p-5">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="broadcast-label text-sm text-indigo-300">
                {connected ? "Live Match" : "Reconnecting"}
              </p>
              <p className="mt-3 broadcast-title text-5xl text-white">
                {myTeam.name} vs {rivalTeam.name}
              </p>
              <p className="mt-2 text-base text-slate-200/78">
                Room {room.id} • Ball {room.currentTurn}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Innings</p>
                <p className="broadcast-title text-3xl text-white">{innings?.number ?? "-"}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current Score</p>
                <p className="broadcast-title text-3xl text-white">
                  {battingTeam?.score ?? "-"} / {battingTeam?.wickets ?? "-"}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Target</p>
                <p className="broadcast-title text-3xl text-indigo-300">{room.targetScore ?? "-"}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Required</p>
                <p className="broadcast-title text-3xl text-emerald-300">{requiredRuns ?? "-"}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-[1.45rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Batter</p>
              <p className="mt-1 text-2xl font-semibold text-white">{activeBatter?.name ?? "Awaiting"}</p>
              <p className="mt-2 text-sm text-slate-300/72">
                Batting side: {battingTeam?.name ?? "-"}
              </p>
            </div>

            <div className="pitch-stripe rounded-[1.9rem] px-6 py-5 text-center text-slate-950">
              <p className="text-xs font-bold uppercase tracking-[0.24em]">Match Pulse</p>
              <p className="score-glow mt-2 broadcast-title text-3xl sm:text-4xl">{matchPulse}</p>
            </div>

            <div className="rounded-[1.45rem] border border-white/10 bg-black/18 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Bowler</p>
              <p className="mt-1 text-2xl font-semibold text-white">{activeBowler?.name ?? "Awaiting"}</p>
              <p className="mt-2 text-sm text-slate-300/72">
                Spell: {innings?.currentSpellBalls ?? 0}/6 balls
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.9fr_1.05fr]">
          {renderTeamColumn(myTeam.id, "text-emerald-300")}

          <section className="glass-panel rounded-[1.8rem] p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Center Stage</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={roundResult?.deliveryNumber ?? room.currentTurn}
                initial={{ opacity: 0, scale: 0.94, y: 18 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  x: roundResult?.isOut ? [0, -8, 8, -5, 5, 0] : 0,
                }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                className={`mt-4 rounded-[1.7rem] border p-6 ${
                  roundResult?.isOut
                    ? "border-rose-400/45 bg-rose-500/12"
                    : roundResult?.runs === 6
                      ? "border-indigo-300/55 bg-indigo-500/12"
                      : roundResult?.runs === 4
                        ? "border-emerald-300/45 bg-emerald-500/12"
                        : "border-white/10 bg-black/18"
                }`}
              >
                <p className="broadcast-title text-5xl text-white">{getRoundHeadline(roundResult)}</p>
                <p className="mt-3 text-base leading-7 text-slate-100/84">
                  {/* {roundResult
                    ? "Number choices are hidden until the ball result is shown."
                    : "The latest ball update lands here as the innings unfolds."} */}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 grid gap-3">
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Chase Situation</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {room.targetScore
                    ? `${battingTeam?.name ?? "Batting side"} need ${requiredRuns ?? 0} more`
                    : `${battingTeam?.name ?? "Batting side"} setting the target`}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Field Update</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {canChooseBowler
                    ? "Bowler change required"
                    : bowlingTeam
                      ? `${bowlingTeam.name} on the ball`
                      : "Field is being set"}
                </p>
              </div>
            </div>
          </section>

          {renderTeamColumn(rivalTeam.id, "text-sky-300")}
        </section>

        <section className="glass-panel rounded-[1.9rem] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="broadcast-title text-3xl text-white">Delivery Pad</p>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                {canChooseBowler
                  ? "Captain must choose the next bowler."
                  : isMyTurn
                    ? "Choose a number from 1 to 6."
                    : room.mode === "solo"
                      ? "Waiting for the bot to play."
                      : "Waiting for the active players."}
              </p>
            </div>
            {error ? (
              <div className="rounded-full border border-rose-400/35 bg-rose-500/12 px-4 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <motion.button
                key={value}
                type="button"
                whileHover={canSelectNumbers ? { y: -3, scale: 1.02 } : undefined}
                whileTap={canSelectNumbers ? { scale: 0.96 } : undefined}
                onClick={() => {
                  playClick();
                  void actions.selectNumber(value);
                }}
                disabled={!canSelectNumbers}
                className={`rounded-[1.45rem] border px-4 py-5 text-center transition ${
                  !canSelectNumbers
                    ? "border-white/8 bg-white/6 text-slate-400"
                    : value === 4
                      ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-100"
                      : value === 6
                        ? "border-indigo-300/45 bg-indigo-500/18 text-indigo-100"
                        : "border-white/12 bg-black/18 text-white hover:border-white/28"
                }`}
              >
                <span className="broadcast-title text-5xl">{value}</span>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
