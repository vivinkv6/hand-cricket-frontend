"use client";

import { motion } from "framer-motion";
import type { PlayerState, PublicRoomState } from "@/lib/game/contracts";
import {
  formatEconomy,
  formatOvers,
  formatStrikeRate,
  getResultCopy,
} from "@/lib/game/presentation";

type RoomActions = {
  requestRematch: (preference: "same" | "swap") => Promise<void>;
};

export function MatchResultScreen({
  room,
  me,
  connected,
  error,
  playClick,
  actions,
}: {
  room: PublicRoomState;
  me: PlayerState;
  connected: boolean;
  error: string;
  playClick: () => void;
  actions: RoomActions;
}) {
  const myTeam = room.teams.find((team) => team.id === me.teamId)!;
  const rivalTeam = room.teams.find((team) => team.id !== me.teamId)!;
  const resultCopy = getResultCopy(room.result, me.teamId);
  const toneClass =
    resultCopy.tone === "success"
      ? "border-emerald-300/40 bg-emerald-500/12"
      : resultCopy.tone === "danger"
        ? "border-rose-300/40 bg-rose-500/12"
        : "border-white/10 bg-black/18";

  const renderSide = (teamId: "A" | "B", title: string) => {
    const team = room.teams.find((entry) => entry.id === teamId)!;
    const players = room.players.filter((player) => player.teamId === teamId);

    return (
      <section className="glass-panel rounded-[1.8rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{title}</p>
            <p className="mt-2 broadcast-title text-3xl text-white">{team.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Final Score</p>
            <p className="broadcast-title text-3xl text-white">
              {team.score}/{team.wickets}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {players.map((player) => (
            <div
              key={player.id}
              className="rounded-[1.4rem] border border-white/10 bg-black/18 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">
                    {player.name} {player.id === me.id ? "(You)" : ""}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {player.isCaptain ? "Captain" : "Player"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Runs</p>
                  <p className="mt-1 font-semibold text-white">{player.runsScored}</p>
                </div>
                <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">SR</p>
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
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Wkts / Eco</p>
                  <p className="mt-1 font-semibold text-white">
                    {player.wicketsTaken} / {formatEconomy(player.runsConceded, player.deliveriesBowled)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <main className="stadium-shell relative min-h-screen overflow-hidden px-4 py-5 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="glass-panel rounded-[1.9rem] p-5">
          <p className="broadcast-label text-sm text-indigo-300">
            {connected ? "Full Time" : "Reconnecting"}
          </p>
          <div className="mt-3 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="broadcast-title text-5xl text-white">
                {myTeam.name} vs {rivalTeam.name}
              </p>
              <p className="mt-2 text-base text-slate-200/78">Room {room.id}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Your Side</p>
                <p className="broadcast-title text-3xl text-white">
                  {myTeam.score}/{myTeam.wickets}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Opposition</p>
                <p className="broadcast-title text-3xl text-white">
                  {rivalTeam.score}/{rivalTeam.wickets}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.9fr_1.05fr]">
          {renderSide(myTeam.id, "Your Side")}

          <section className="glass-panel rounded-[1.8rem] p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Match Result</p>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`mt-4 rounded-[1.7rem] border p-6 text-center ${toneClass}`}
            >
              <p className="broadcast-title text-5xl text-white">{resultCopy.headline}</p>
              <p className="mt-3 text-lg leading-8 text-slate-100/86">{resultCopy.subline}</p>
              <p className="mt-5 text-sm uppercase tracking-[0.18em] text-slate-300/72">
                {room.result?.winnerTeamId
                  ? `${room.teams.find((team) => team.id === room.result?.winnerTeamId)?.name} finished on ${room.result?.winningScore}.`
                  : "Both teams finished level."}
              </p>
            </motion.div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  void actions.requestRematch("same");
                }}
                className="rounded-[1.25rem] bg-indigo-500 px-4 py-4 text-left"
              >
                <span className="block broadcast-title text-2xl text-white">Play Again</span>
                <span className="mt-1 block text-sm text-indigo-100/78">
                  Reset the room and return to the pre-match lobby.
                </span>
              </button>

              {room.mode === "team" ? (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    void actions.requestRematch("swap");
                  }}
                  className="rounded-[1.25rem] border border-white/12 bg-white/10 px-4 py-4 text-left"
                >
                  <span className="block broadcast-title text-2xl text-white">Swap Sides</span>
                  <span className="mt-1 block text-sm text-slate-200/74">
                    Flip both teams before the rematch starts.
                  </span>
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </section>

          {renderSide(rivalTeam.id, "Opposition")}
        </section>
      </div>
    </main>
  );
}
