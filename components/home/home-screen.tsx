"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveStoredSession } from "@/hooks/use-game-room";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { GAME_EVENTS, type GameMode } from "@/lib/game/contracts";
import { isValidRoomId, normalizeRoomId } from "@/lib/game/room-id";
import { emitWithAck, getGameSocket } from "@/lib/socket/game-socket";
import { useAudioState } from "@/hooks/use-audio-state";


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
  const { isMuted, toggleMute } = useAudioState();
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
  const canSpectate =
    selectedMode !== "solo" && isValidRoomId(normalizedRoomCode) && !loadingState;

  const navigateToRoom = (
    roomId: unknown,
    reason: "create" | "join" | "reconnect",
  ) => {
    if (!isValidRoomId(roomId)) {
      setError("That room could not be opened because the room code is invalid.");
      return;
    }

    const safeRoomId = normalizeRoomId(roomId);
    router.push(`/room/${safeRoomId}`);
  };

  const ensurePlayerName = () => {
    const safePlayerName = playerName.trim();
    if (!safePlayerName) {
      throw new Error("Enter your name to continue.");
    }

    return safePlayerName;
  };

  const onSpectate = () => {
    try {
      playClick();
      setError("");
      if (!isValidRoomId(normalizedRoomCode)) {
        throw new Error("Enter a valid room code.");
      }

      router.push(`/spectate/${normalizedRoomCode}`);
    } catch (spectateError) {
      setError(
        spectateError instanceof Error ? spectateError.message : "Unable to open spectator mode.",
      );
    }
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
    <main className="stadium-shell relative min-h-screen overflow-x-hidden px-3 py-4 text-white sm:px-4 sm:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_34%)]" />
      <div className="mx-auto w-full max-w-6xl">

        <section className="rounded-2xl border border-white/8 bg-black/16 p-4 shadow-2xl backdrop-blur-sm sm:rounded-[2rem] sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <p className="broadcast-label text-xs text-indigo-300 sm:text-sm">Hand Cricket Arena</p>
                <h1 className="mt-3 text-3xl font-black uppercase italic tracking-[0.08em] text-white sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">
                  Clean matches,
                  <span className="mt-1 block text-indigo-300 sm:mt-2">cricket-first UI.</span>
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-200/78 sm:mt-4 sm:text-base lg:text-lg">
                  Start a practice game, open a private duel, or set up a team room
                  with a cleaner match flow and faster room entry.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                      className={`rounded-2xl border p-3 text-left transition sm:rounded-[1.4rem] sm:p-4 ${
                        active
                          ? "border-indigo-300/55 bg-indigo-500/12"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <p className="broadcast-title text-xl text-white sm:text-2xl">{option.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300/78 sm:mt-2 sm:text-sm">{option.subtitle}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <aside className="glass-panel mt-4 rounded-2xl p-4 sm:mt-0 sm:rounded-[1.8rem] sm:p-5">
              <p className="broadcast-title text-2xl text-white sm:text-3xl">Match Desk</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400 sm:mt-2 sm:text-sm">
                {modeMeta.subtitle}
              </p>

              <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-white/10 bg-black/18 px-4 py-3 text-base outline-none placeholder:text-slate-500 focus:border-indigo-300/55 sm:rounded-[1.2rem]"
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
                          className={`rounded-xl border px-2 py-2 text-xs font-semibold transition sm:rounded-[1rem] sm:px-3 sm:py-3 sm:text-sm ${
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
                  className="w-full rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60 sm:rounded-[1.25rem] sm:py-4"
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
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-3 sm:rounded-[1.4rem] sm:p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Join with room code</p>
                    <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:gap-2">
                      <input
                        value={roomCode}
                        onChange={(event) => setRoomCode(event.target.value)}
                        placeholder="Enter code"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/18 px-4 py-3 text-base uppercase outline-none placeholder:text-slate-500 focus:border-indigo-300/55 sm:rounded-[1rem]"
                      />
                      <button
                        type="button"
                        onClick={() => void onJoin()}
                        disabled={!canJoin}
                        className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60 sm:rounded-[1rem]"
                      >
                        {loadingState === "join" ? "Joining" : "Join"}
                      </button>
                      <button
                        type="button"
                        onClick={onSpectate}
                        disabled={!canSpectate}
                        className="rounded-xl border border-primary/35 bg-primary px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60 sm:rounded-[1rem]"
                      >
                        Watch Live
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-3 text-xs leading-5 text-slate-300/78 sm:rounded-[1.4rem] sm:p-4 sm:text-sm sm:leading-6">
                    Solo mode skips room codes and takes you straight into a bot match.
                  </div>
                )}

                {error ? (
                  <div className="rounded-xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-sm text-rose-100 sm:rounded-2xl">
                    {error}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </section>
      </div>

      <button
        onClick={toggleMute}
        className="fixed bottom-6 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full glass-panel border border-white/20 text-white shadow-2xl transition-all hover:border-primary/50 active:scale-90 sm:bottom-8 sm:right-6 sm:h-14 sm:w-14"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <span className="text-lg rotate-12 opacity-50 sm:text-xl">🔇</span>
        ) : (
          <span className="text-lg animate-pulse sm:text-xl">🔊</span>
        )}
      </button>
    </main>

  );
}
