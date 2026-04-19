"use client";

import { motion } from "framer-motion";
import type { PublicRoomState, PlayerState, TeamId } from "@/lib/game/contracts";
import { getDisplayMode, getSwapSideCopy } from "@/lib/game/presentation";

type RoomActions = {
  startGame: () => Promise<void>;
  selectBowler: (bowlerId: string) => Promise<void>;
  selectToss: (choice: "bat" | "bowl") => Promise<void>;
  requestRematch: (preference: "same" | "swap") => Promise<void>;
  swapTeam: (targetTeamId: TeamId) => Promise<void>;
  renameTeam: (teamId: TeamId, name: string) => Promise<void>;
};

export function RoomLobby({
  room,
  me,
  connected,
  error,
  playClick,
  teamDraftName,
  setTeamDraftName,
  actions,
}: {
  room: PublicRoomState;
  me: PlayerState;
  connected: boolean;
  error: string;
  playClick: () => void;
  teamDraftName: string;
  setTeamDraftName: (value: string) => void;
  actions: RoomActions;
}) {
  const myTeam = room.teams.find((team) => team.id === me.teamId)!;
  const opponentTeam = room.teams.find((team) => team.id !== me.teamId)!;
  const totalHumans = room.players.filter((player) => !player.isBot).length;
  const isTossWinner = room.toss?.decisionMakerId === me.id;
  const canStartToss = me.isCaptain && room.status === "ready" && !room.toss;

  const renderTeamColumn = (teamId: TeamId, accentClass: string) => {
    const team = room.teams.find((entry) => entry.id === teamId)!;
    const roster = room.players.filter((player) => player.teamId === teamId);
    const isMySide = team.id === me.teamId;
    const canRename = isMySide && me.isCaptain;
    const canSwap = isMySide && room.mode === "team" && ["waiting", "ready"].includes(room.status);

    return (
      <section className="glass-panel rounded-[1.8rem] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`broadcast-title text-3xl ${accentClass}`}>{team.name}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              Squad listed
            </p>
          </div>
          {canSwap ? (
            <button
              type="button"
              onClick={() => {
                playClick();
                void actions.swapTeam(team.id === "A" ? "B" : "A");
              }}
              className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white transition hover:border-indigo-300/45"
            >
              {getSwapSideCopy(room.mode)}
            </button>
          ) : null}
        </div>

        {canRename ? (
          <div className="mt-4 flex gap-2">
            <input
              value={teamDraftName}
              onChange={(event) => setTeamDraftName(event.target.value)}
              placeholder="Rename your side"
              className="flex-1 rounded-[1rem] border border-white/10 bg-black/18 px-3 py-3 outline-none placeholder:text-slate-500 focus:border-indigo-300/45"
            />
            <button
              type="button"
              onClick={() => {
                playClick();
                void actions.renameTeam(team.id, teamDraftName);
                setTeamDraftName("");
              }}
              className="rounded-[1rem] bg-indigo-500 px-4 py-3 font-semibold text-white"
            >
              Save
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {roster.map((player) => (
            <div
              key={player.id}
              className="rounded-[1.4rem] border border-white/10 bg-black/18 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">
                    {player.name} {player.id === me.id ? "(You)" : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-300/72">
                    {player.connected ? "Ready for the next match" : "Waiting to reconnect"}
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="broadcast-label text-sm text-indigo-300">
                {connected ? "Match Lobby" : "Reconnecting"}
              </p>
              <p className="mt-3 broadcast-title text-5xl text-white">
                {myTeam.name} vs {opponentTeam.name}
              </p>
              <p className="mt-2 text-base text-slate-200/78">
                Room {room.id} • {getDisplayMode(room.mode)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.3rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Players</p>
                <p className="broadcast-title text-3xl text-white">
                  {totalHumans}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Match State</p>
                <p className="broadcast-title text-3xl text-indigo-300">
                  {room.status === "toss" ? "Toss" : "Ready"}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/18 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Room Style</p>
                <p className="broadcast-title text-3xl text-emerald-300">
                  {room.mode === "duel" ? "Heads Up" : room.mode === "team" ? "Squads" : "Practice"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.9fr_1.05fr]">
          {renderTeamColumn(myTeam.id, "text-emerald-300")}

          <section className="glass-panel rounded-[1.8rem] p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Match Start</p>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mt-4 rounded-[1.7rem] border border-white/10 bg-black/18 p-6"
            >
              <p className="broadcast-title text-4xl text-white">
                {room.status === "toss"
                  ? "Toss in Progress"
                  : room.mode === "solo"
                    ? "Practice Match Ready"
                    : "Teams Locked In"}
              </p>
              <p className="mt-3 text-base leading-7 text-slate-100/82">
                {room.status === "toss"
                  ? `${room.teams.find((team) => team.id === room.toss?.winnerTeamId)?.name ?? "A team"} won the toss.`
                  : room.mode === "solo"
                    ? "Start the match and move straight into the toss and first innings."
                    : room.mode === "duel"
                      ? "Both players are in. Start the toss to decide who opens the batting."
                      : "Both sides are listed and ready. Captains can now begin the toss."}
              </p>
            </motion.div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Captain Calls</p>
                <p className="mt-1 text-sm leading-6 text-slate-200/78">
                  {room.mode === "team"
                    ? "Captains manage team names, the toss, and bowling changes."
                    : room.mode === "duel"
                      ? "Captains begin the toss and then take the field."
                      : "The bot will handle the other side automatically."}
                </p>
              </div>

              {room.status === "toss" && room.toss ? (
                isTossWinner ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        void actions.selectToss("bat");
                      }}
                      className="rounded-[1.2rem] bg-indigo-500 px-4 py-4 broadcast-title text-2xl text-white"
                    >
                      Bat First
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        void actions.selectToss("bowl");
                      }}
                      className="rounded-[1.2rem] border border-white/12 bg-white/10 px-4 py-4 broadcast-title text-2xl text-white"
                    >
                      Bowl First
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[1.2rem] border border-white/12 bg-white/10 px-4 py-4 text-sm leading-6 text-slate-200/80">
                    Waiting for the toss winner to choose whether to bat or bowl.
                  </div>
                )
              ) : null}

              {(canStartToss || room.mode === "solo") && room.status !== "toss" ? (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    void actions.startGame();
                  }}
                  className="rounded-[1.3rem] bg-indigo-500 px-5 py-4 broadcast-title text-3xl text-white transition hover:bg-indigo-400"
                >
                  {room.mode === "solo" ? "Start Practice Match" : "Start Toss"}
                </button>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
            </div>
          </section>

          {renderTeamColumn(opponentTeam.id, "text-sky-300")}
        </section>
      </div>
    </main>
  );
}
