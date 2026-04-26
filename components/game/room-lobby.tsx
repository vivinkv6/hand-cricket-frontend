"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { PlayerState, PublicRoomState, TeamId } from "@/lib/game/contracts";
import { getDisplayMode, getTeamById } from "@/lib/game/presentation";

type RoomLobbyActions = {
  startGame: () => Promise<void>;
  selectToss: (choice: "bat" | "bowl") => Promise<void>;
  swapTeam: (targetTeamId: TeamId) => Promise<void>;
  renameTeam: (teamId: TeamId, name: string) => Promise<void>;
};

export function RoomLobby({
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
  actions: RoomLobbyActions;
}) {
  const canManageTeams =
    room.mode === "team" && ["waiting", "ready", "completed"].includes(room.status);
  const canStartGame =
    me.isCaptain && (room.status === "ready" || room.status === "waiting");
  const isTossDecisionMaker = room.status === "toss" && room.toss?.decisionMakerId === me.id;
  const tossWinner = room.toss ? getTeamById(room, room.toss.winnerTeamId) : null;
  const myTeam = room.teams.find((team) => team.id === me.teamId) ?? null;

  const rosterCount = (teamId: TeamId) =>
    room.players.filter((player) => player.teamId === teamId).length;

  const statusCopy = (() => {
    switch (room.status) {
      case "waiting":
        return "Waiting for players to fill both sides.";
      case "ready":
        return "Both sides are set. Start the toss when your captain is ready.";
      case "toss":
        return "Toss is live. The winner chooses batting or bowling.";
      default:
        return "Preparing the room.";
    }
  })();

  return (
    <main className="stadium-shell min-h-screen px-3 py-4 text-white sm:px-4 sm:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">
        <section className="glass-panel overflow-hidden rounded-[1.75rem] border border-white/10 p-4 sm:rounded-[2.25rem] sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="broadcast-label text-xs text-primary">
                  {getDisplayMode(room.mode)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                    connected
                      ? "bg-emerald-500/12 text-emerald-300"
                      : "bg-rose-500/12 text-rose-300"
                  }`}
                >
                  {connected ? "Connected" : "Reconnecting"}
                </span>
              </div>
              <div>
                <h1 className="broadcast-title text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
                  Room {room.id}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {statusCopy}
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[260px]">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Match State
                </div>
                <div className="mt-2 text-lg font-black capitalize text-white sm:text-xl">
                  {room.status}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-3 sm:p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Players
                </div>
                <div className="mt-2 text-lg font-black text-white sm:text-xl">
                  {room.players.filter((player) => !player.isBot).length}/{room.maxPlayers}
                </div>
              </div>
            </div>
          </div>
        </section>

        {room.status === "toss" && room.toss ? (
          <section className="glass-panel rounded-[1.75rem] border border-primary/20 p-4 sm:rounded-[2.25rem] sm:p-6 lg:p-8">
            <div className="mx-auto flex max-w-4xl flex-col gap-5 text-center">
              <div className="space-y-2">
                <p className="broadcast-label text-xs text-primary sm:text-sm">Toss Time</p>
                <h2 className="broadcast-title text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
                  {tossWinner?.name ?? "Winning side"} won the toss
                </h2>
                <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {isTossDecisionMaker
                    ? "Choose how your side wants to begin. This choice sets the first innings immediately."
                    : "Waiting for the toss winner to choose batting or bowling."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Toss Winner
                    </div>
                    {me.isCaptain && tossWinner?.captainId === me.id && (
                      <button
                        type="button"
                        onClick={() => {
                          const newName = prompt("Rename team:", tossWinner?.name);
                          if (newName?.trim()) {
                            playClick();
                            void actions.renameTeam(tossWinner.id, newName.trim());
                          }
                        }}
                        className="rounded border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:border-primary/40 hover:text-primary"
                        title="Rename team"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-xl font-black text-white sm:text-2xl">
                    {tossWinner?.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    Captain:{" "}
                    {tossWinner?.captainId
                      ? room.players.find((player) => player.id === tossWinner.captainId)?.name
                      : "Pending"}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      You
                    </div>
                    {me.isCaptain && myTeam?.id === me.teamId && (
                      <button
                        type="button"
                        onClick={() => {
                          const newName = prompt("Rename team:", myTeam?.name);
                          if (newName?.trim()) {
                            playClick();
                            void actions.renameTeam(myTeam.id, newName.trim());
                          }
                        }}
                        className="rounded border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:border-primary/40 hover:text-primary"
                        title="Rename team"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-xl font-black text-white sm:text-2xl">
                    {myTeam?.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    {me.isCaptain ? "You are captain" : "Captain-led decision in progress"}
                  </div>
                </div>
              </div>

              {isTossDecisionMaker ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      playClick();
                      void actions.selectToss("bat");
                    }}
                    className="rounded-[1.5rem] border border-primary/40 bg-primary px-5 py-5 text-left text-slate-950 shadow-xl transition hover:brightness-110"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.18em]">
                      Choose
                    </div>
                    <div className="mt-2 text-2xl font-black sm:text-3xl">Bat First</div>
                    <div className="mt-2 text-sm leading-6 text-slate-900/80">
                      Put runs on the board and defend in the chase.
                    </div>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      playClick();
                      void actions.selectToss("bowl");
                    }}
                    className="rounded-[1.5rem] border border-white/15 bg-white/8 px-5 py-5 text-left text-white shadow-xl transition hover:border-primary/40 hover:bg-white/10"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                      Choose
                    </div>
                    <div className="mt-2 text-2xl font-black sm:text-3xl">Bowl First</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      Attack early and chase with a clear target later.
                    </div>
                  </motion.button>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-5 text-center sm:px-6">
                  <div className="text-sm uppercase tracking-[0.18em] text-slate-400">
                    Toss Decision Pending
                  </div>
                  <div className="mt-2 text-xl font-black text-white sm:text-2xl">
                    Waiting for {room.players.find((player) => player.id === room.toss?.decisionMakerId)?.name}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          {room.teams.map((team) => {
            const captain = team.captainId
              ? room.players.find((player) => player.id === team.captainId) ?? null
              : null;
            const isMyTeam = team.id === me.teamId;
            const canRename = me.isCaptain && me.teamId === team.id;
            const [showRenameDialog, setShowRenameDialog] = useState(false);
            const [draftName, setDraftName] = useState("");

            const openRenameDialog = () => {
              setDraftName(team.name);
              setShowRenameDialog(true);
            };

            const saveRename = () => {
              const nextName = draftName.trim();
              if (!nextName) {
                return;
              }
              playClick();
              void actions.renameTeam(team.id, nextName);
              setShowRenameDialog(false);
            };

            return (
              <div
                key={team.id}
                className={`glass-panel relative rounded-[1.75rem] border p-4 sm:p-5 ${
                  isMyTeam ? "border-primary/30" : "border-white/10"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="broadcast-title break-words text-2xl text-white sm:text-3xl">
                        {team.name}
                      </h3>
                      {canRename && (
                        <button
                          type="button"
                          onClick={openRenameDialog}
                          className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-primary/40 hover:text-primary"
                          title="Rename team"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      )}
                      {isMyTeam ? (
                        <span className="rounded-full bg-primary/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          Your Team
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      Captain: {captain?.name ?? "Waiting for players"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:min-w-[150px]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                        Filled
                      </div>
                      <div className="mt-1 text-lg font-black text-white">
                        {rosterCount(team.id)}/{room.teamSize}
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showRenameDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowRenameDialog(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="glass-panel relative z-10 w-full max-w-sm rounded-[1.5rem] border border-white/20 p-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-4">
                          <div className="text-center">
                            <p className="text-xs uppercase tracking-[0.18em] text-primary">
                              Rename Team
                            </p>
                            <h4 className="mt-1 text-xl font-bold text-white">{team.name}</h4>
                          </div>
                            <input
                              type="text"
                              value={draftName}
                              onChange={(e) => setDraftName(e.target.value)}
                              placeholder="Enter new team name"
                              className="w-full rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary/50"
                              maxLength={24}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setShowRenameDialog(false)}
                                className="flex-1 rounded-[1rem] border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveRename}
                                disabled={!draftName.trim()}
                                className="flex-1 rounded-[1rem] bg-primary px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                <div className="mt-4 grid gap-3">
                  {room.players
                    .filter((player) => player.teamId === team.id)
                    .map((player) => {
                      const canSwitch =
                        canManageTeams && player.id === me.id && !player.isBot;
                      const moveTarget = team.id === "A" ? "B" : "A";

                      return (
                        <div
                          key={player.id}
                          className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-base font-bold text-white sm:text-lg">
                                  {player.name}
                                  {player.id === me.id ? " (You)" : ""}
                                </span>
                                {player.isCaptain ? (
                                  <span className="rounded-full bg-primary/14 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                    Captain
                                  </span>
                                ) : null}
                                {!player.connected ? (
                                  <span className="rounded-full bg-rose-500/14 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300">
                                    Offline
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {canSwitch ? (
                              <button
                                type="button"
                                onClick={() => {
                                  playClick();
                                  void actions.swapTeam(moveTarget);
                                }}
                                className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 transition hover:border-primary/40 hover:text-primary"
                              >
                                Move to Team {moveTarget}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </section>

        <section className="glass-panel rounded-[1.75rem] border border-white/10 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="broadcast-title text-2xl text-white sm:text-3xl">
                Match Controls
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Captains can start the toss once both sides are filled. Team changes stay in the
                room phase only, so the live match flow remains untouched.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <button
                type="button"
                disabled={!canStartGame}
                onClick={() => {
                  playClick();
                  void actions.startGame();
                }}
                className="w-full rounded-[1.2rem] bg-primary px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[210px]"
              >
                {room.status === "ready" ? "Start Toss" : "Waiting To Start"}
              </button>
            </div>
          </div>

          {!canStartGame && room.status !== "toss" ? (
            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {me.isCaptain
                ? "Fill both sides to unlock the toss."
                : "Your captain will start the toss once the room is ready."}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[1.2rem] border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
