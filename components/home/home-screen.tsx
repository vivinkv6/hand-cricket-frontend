"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveStoredSession } from "@/hooks/use-game-room";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { GAME_EVENTS, type GameMode } from "@/lib/game/contracts";
import { isValidRoomId, normalizeRoomId } from "@/lib/game/room-id";
import { emitWithAck, getGameSocket } from "@/lib/socket/game-socket";

const MODE_OPTIONS: Array<{
  mode: GameMode;
  title: string;
  subtitle: string;
}> = [
  { mode: "solo", title: "Solo", subtitle: "Practice against the bot" },
  { mode: "duel", title: "1v1", subtitle: "Private head-to-head match" },
  { mode: "team", title: "Teams", subtitle: "2v2 to 5v5 captain-led cricket" },
];

export function HomeScreen() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<GameMode>("solo");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [teamSize, setTeamSize] = useState(2);
  const [error, setError] = useState("");
  const [loadingState, setLoadingState] = useState<"" | "create" | "join">("");
  const { playClick } = useSoundEffects({
    roundResult: null,
    result: null,
    homeMusic: true,
  });

  const modeMeta = MODE_OPTIONS.find((option) => option.mode === selectedMode)!;
  const normalizedRoomCode = normalizeRoomId(roomCode);
  const canCreate = Boolean(playerName.trim()) && !loadingState;
  const canJoin =
    selectedMode !== "solo" &&
    Boolean(playerName.trim()) &&
    isValidRoomId(normalizedRoomCode) &&
    !loadingState;

  const navigateToRoom = (
    roomId: unknown,
    reason: "create" | "join" | "reconnect",
  ) => {
    if (!isValidRoomId(roomId)) {
      console.error("Invalid roomId", { reason, roomId });
      setError("That room could not be opened because the room code is invalid.");
      return;
    }

    const safeRoomId = normalizeRoomId(roomId);
    console.info("[navigation] room", { reason, roomId: safeRoomId });
    router.push(`/room/${safeRoomId}`);
  };

  const ensurePlayerName = () => {
    const safePlayerName = playerName.trim();
    if (!safePlayerName) {
      throw new Error("Enter your name to continue.");
    }

    return safePlayerName;
  };

  const onCreate = async () => {
    try {
      playClick();
      setError("");
      setLoadingState("create");
      const safePlayerName = ensurePlayerName();
      const socket = getGameSocket();
      if (!socket.connected) {
        socket.connect();
      }

      const response = await emitWithAck<{ roomId: string; playerId: string }>(
        GAME_EVENTS.CREATE_ROOM,
        {
          mode: selectedMode,
          playerName: safePlayerName,
          teamSize: selectedMode === "team" ? teamSize : 1,
        },
      );

      saveStoredSession({
        roomId: response.roomId,
        playerId: response.playerId,
        playerName: safePlayerName,
      });
      navigateToRoom(response.roomId, "create");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to start the match.",
      );
    } finally {
      setLoadingState("");
    }
  };

  const onJoin = async () => {
    try {
      playClick();
      setError("");
      setLoadingState("join");
      const safePlayerName = ensurePlayerName();
      if (!isValidRoomId(normalizedRoomCode)) {
        throw new Error("Enter a valid room code.");
      }

      const socket = getGameSocket();
      if (!socket.connected) {
        socket.connect();
      }

      const response = await emitWithAck<{ roomId: string; playerId: string }>(
        GAME_EVENTS.JOIN_ROOM,
        {
          roomId: normalizedRoomCode,
          playerName: safePlayerName,
        },
      );

      saveStoredSession({
        roomId: response.roomId,
        playerId: response.playerId,
        playerName: safePlayerName,
      });
      navigateToRoom(response.roomId, "join");
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Unable to join that room.");
    } finally {
      setLoadingState("");
    }
  };

  return (
    <main className="stadium-shell relative min-h-screen overflow-hidden px-4 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_34%)]" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] border border-white/8 bg-black/16 p-6 shadow-2xl backdrop-blur-sm lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col justify-between gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <p className="broadcast-label text-sm text-indigo-300">Hand Cricket Arena</p>
                <h1 className="mt-4 text-5xl font-black uppercase italic tracking-[0.08em] text-white sm:text-6xl">
                  Clean matches,
                  <span className="mt-2 block text-indigo-300">cricket-first UI.</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-200/78 sm:text-lg">
                  Start a practice game, open a private duel, or set up a team room
                  with a cleaner match flow and faster room entry.
                </p>
              </motion.div>

              <div className="grid gap-3 md:grid-cols-3">
                {MODE_OPTIONS.map((option, index) => {
                  const active = option.mode === selectedMode;

                  return (
                    <motion.button
                      key={option.mode}
                      type="button"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * index, duration: 0.35 }}
                      onClick={() => {
                        playClick();
                        setSelectedMode(option.mode);
                        setError("");
                      }}
                      className={`rounded-[1.4rem] border p-4 text-left transition ${
                        active
                          ? "border-indigo-300/55 bg-indigo-500/12"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <p className="broadcast-title text-2xl text-white">{option.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300/78">{option.subtitle}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <aside className="glass-panel rounded-[1.8rem] p-5">
              <p className="broadcast-title text-3xl text-white">Match Desk</p>
              <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-400">
                {modeMeta.subtitle}
              </p>

              <div className="mt-5 space-y-4">
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-3 text-base outline-none placeholder:text-slate-500 focus:border-indigo-300/55"
                />

                {selectedMode === "team" ? (
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Team Size
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            playClick();
                            setTeamSize(size);
                          }}
                          className={`rounded-[1rem] border px-3 py-3 text-sm font-semibold transition ${
                            teamSize === size
                              ? "border-indigo-300/55 bg-indigo-500/14 text-white"
                              : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                          }`}
                        >
                          {size}v{size}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void onCreate()}
                  disabled={!canCreate}
                  className="w-full rounded-[1.25rem] bg-indigo-500 px-5 py-4 font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
                >
                  {loadingState === "create"
                    ? selectedMode === "solo"
                      ? "Preparing Match..."
                      : "Creating Room..."
                    : selectedMode === "solo"
                      ? "Play Now"
                      : "Create Room"}
                </button>

                {selectedMode !== "solo" ? (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Join with room code</p>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={roomCode}
                        onChange={(event) => setRoomCode(event.target.value)}
                        placeholder="Enter code"
                        className="min-w-0 flex-1 rounded-[1rem] border border-white/10 bg-black/18 px-4 py-3 text-base uppercase outline-none placeholder:text-slate-500 focus:border-indigo-300/55"
                      />
                      <button
                        type="button"
                        onClick={() => void onJoin()}
                        disabled={!canJoin}
                        className="rounded-[1rem] bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                      >
                        {loadingState === "join" ? "Joining" : "Join"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 text-sm leading-6 text-slate-300/78">
                    Solo mode skips room codes and takes you straight into a bot match.
                  </div>
                )}

                {error ? (
                  <div className="rounded-2xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
