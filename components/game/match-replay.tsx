"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MatchReplayResponse, ReplayEvent, TeamId } from "@/lib/game/contracts";
import { formatOvers, getResultCopy } from "@/lib/game/presentation";

type ReplayFrame = {
  currentIndex: number;
  activeEvent: ReplayEvent | null;
  teamScores: Record<TeamId, { runs: number; wickets: number; balls: number }>;
  playerStats: Record<
    string,
    { runs: number; balls: number; wickets: number; runsConceded: number }
  >;
};

type ReplayStore = {
  matchId: string;
  metadata: MatchReplayResponse["metadata"];
  events: ReplayEvent[];
  segment: MatchReplayResponse["segment"];
};

const PLAYBACK_SPEEDS = [1, 2, 4] as const;
const SEGMENT_SIZE = 24;

export function MatchReplay({
  matchId,
  returnTo,
}: {
  matchId: string;
  returnTo?: "room" | "spectate" | null;
}) {
  const [replay, setReplay] = useState<ReplayStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof PLAYBACK_SPEEDS)[number]>(1);
  const [frameIndex, setFrameIndex] = useState(0);
  const [currentHighlight, setCurrentHighlight] = useState<ReplayEvent | null>(null);
  const loadingCursorRef = useRef<number | null>(null);

  const fetchSegment = async (cursor = 0) => {
    const params = new URLSearchParams({
      cursor: String(cursor),
      limit: String(SEGMENT_SIZE),
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:5001"}/matches/${matchId}/replay?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error("Replay not available for this match.");
    }

    return (await response.json()) as MatchReplayResponse;
  };

  useEffect(() => {
    let active = true;

    const loadReplay = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await fetchSegment(0);

        if (!active) {
          return;
        }

        setReplay({
          matchId: payload.matchId,
          metadata: payload.metadata,
          events: payload.events,
          segment: payload.segment,
        });
        setFrameIndex(payload.events.length > 0 ? 0 : -1);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : "Unable to load match replay.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadReplay();

    return () => {
      active = false;
    };
  }, [matchId]);

  const loadMoreEvents = async () => {
    if (!replay?.segment.hasMore || loadingMore || replay.segment.nextCursor === null) {
      return;
    }

    if (loadingCursorRef.current === replay.segment.nextCursor) {
      return;
    }

    loadingCursorRef.current = replay.segment.nextCursor;
    setLoadingMore(true);

    try {
      const payload = await fetchSegment(replay.segment.nextCursor);
      setReplay((current) => {
        if (!current) {
          return current;
        }

        const mergedEvents = [...current.events];
        payload.events.forEach((event, index) => {
          mergedEvents[payload.segment.cursor + index] = event;
        });

        return {
          ...current,
          events: mergedEvents,
          segment: payload.segment,
        };
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load more replay events.",
      );
      setIsPlaying(false);
    } finally {
      setLoadingMore(false);
      loadingCursorRef.current = null;
    }
  };

  const frames = useMemo(() => {
    if (!replay) {
      return [] as ReplayFrame[];
    }

    const baseScores: ReplayFrame["teamScores"] = {
      A: { runs: 0, wickets: 0, balls: 0 },
      B: { runs: 0, wickets: 0, balls: 0 },
    };
    const playerStats: ReplayFrame["playerStats"] = Object.fromEntries(
      replay.metadata.players.map((player) => [
        player.id,
        { runs: 0, balls: 0, wickets: 0, runsConceded: 0 },
      ]),
    );

    return replay.events.map((event, index) => {
      const battingTeamId = event.battingTeamId;
      const bowlerId = event.bowlerId;
      const batsmanId = event.batsmanId;

      if (battingTeamId) {
        baseScores[battingTeamId].balls += 1;
        baseScores[battingTeamId].runs += event.runs;
        if (event.result === "wicket") {
          baseScores[battingTeamId].wickets += 1;
        }
      }

      if (batsmanId && playerStats[batsmanId]) {
        playerStats[batsmanId].balls += 1;
        playerStats[batsmanId].runs += event.runs;
      }

      if (bowlerId && playerStats[bowlerId]) {
        playerStats[bowlerId].runsConceded += event.runs;
        if (event.result === "wicket") {
          playerStats[bowlerId].wickets += 1;
        }
      }

      return {
        currentIndex: index,
        activeEvent: event,
        teamScores: {
          A: { ...baseScores.A },
          B: { ...baseScores.B },
        },
        playerStats: Object.fromEntries(
          Object.entries(playerStats).map(([playerId, stats]) => [playerId, { ...stats }]),
        ),
      };
    });
  }, [replay]);

  const currentFrame =
    frameIndex >= 0 && frameIndex < frames.length ? frames[frameIndex] : null;
  const maxFrameIndex = replay ? Math.max(replay.segment.totalEvents - 1, 0) : 0;
  const resultCopy = getResultCopy(replay?.metadata.result ?? null, replay?.metadata.mode);
  const returnHref =
    returnTo === "spectate"
      ? `/spectate/${matchId}`
      : returnTo === "room"
        ? `/room/${matchId}`
        : null;
  const returnLabel =
    returnTo === "spectate"
      ? "Back to Spectator Room"
      : returnTo === "room"
        ? "Back to Match Room"
        : null;
  const spectatorHref = `/spectate/${matchId}`;
  const visibleTimeline = useMemo(() => {
    if (!replay) {
      return [];
    }

    return buildReplayOvers(replay.events).slice(0, 16);
  }, [frameIndex, replay]);

  useEffect(() => {
    if (!currentFrame?.activeEvent) {
      return;
    }

    if (
      currentFrame.activeEvent.highlightTags.includes("wicket") ||
      currentFrame.activeEvent.highlightTags.includes("six") ||
      currentFrame.activeEvent.highlightTags.includes("milestone")
    ) {
      setCurrentHighlight(currentFrame.activeEvent);
      const timer = window.setTimeout(() => setCurrentHighlight(null), 1350);
      return () => window.clearTimeout(timer);
    }
  }, [currentFrame?.activeEvent]);

  useEffect(() => {
    if (!isPlaying || !replay || replay.segment.totalEvents === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= replay.segment.totalEvents - 1) {
          setIsPlaying(false);
          return current;
        }

        const nextIndex = current + 1;
        if (
          replay.segment.hasMore &&
          replay.segment.nextCursor !== null &&
          nextIndex >= replay.events.length - 4
        ) {
          void loadMoreEvents();
        }

        if (nextIndex >= replay.events.length) {
          return current;
        }

        return nextIndex;
      });
    }, 1000 / speed);

    return () => window.clearInterval(interval);
  }, [isPlaying, replay, speed]);

  if (loading) {
    return (
      <main className="stadium-shell flex min-h-screen items-center justify-center px-4 text-white">
        <div className="glass-panel rounded-[2rem] p-8 text-center">
          <p className="broadcast-title text-4xl text-primary">Loading Replay</p>
          <p className="mt-3 text-lg text-slate-200/78">Building the innings timeline.</p>
        </div>
      </main>
    );
  }

  if (!replay || error) {
    return (
      <main className="stadium-shell flex min-h-screen items-center justify-center px-4 text-white">
        <div className="glass-panel max-w-lg rounded-[2rem] p-8 text-center">
          <p className="broadcast-title text-4xl text-rose-300">Replay Unavailable</p>
          <p className="mt-3 text-lg text-slate-200/78">{error || "Replay data could not be found."}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-white/8 px-5 py-3 text-sm uppercase tracking-[0.18em] text-white"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="stadium-shell min-h-screen px-4 py-6 text-white">
      <div className="broadcast-stage mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-[2.5rem] p-2">
        <section className="glass-panel highlight-shell rounded-[2rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="broadcast-label text-primary">Match Replay</span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-100">
                  {replay.segment.totalEvents} balls archived
                </span>
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
                  Segmented loading active
                </span>
              </div>
              <div>
                <h1 className="broadcast-title text-4xl text-white sm:text-5xl">Replay {replay.matchId}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{resultCopy.subline}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {replay.metadata.teams.map((team) => (
                <div key={team.id} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{team.name}</div>
                  <div className="mt-2 text-lg font-black text-white">
                    {currentFrame?.teamScores[team.id].runs ?? 0}/{currentFrame?.teamScores[team.id].wickets ?? 0}
                  </div>
                </div>
              ))}
              <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Position</div>
                <div className="mt-2 text-lg font-black text-white">
                  {frameIndex >= 0 ? frameIndex + 1 : 0}/{replay.segment.totalEvents}
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Speed</div>
                <div className="mt-2 text-lg font-black text-white">{speed}x</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5">
              <AnimatePresence>
                {currentHighlight ? (
                  <motion.div
                    key={`${currentHighlight.inningsNumber}-${currentHighlight.ballNumber}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`pointer-events-none absolute inset-0 ${
                      currentHighlight.highlightTags.includes("wicket")
                        ? "bg-[radial-gradient(circle_at_center,rgba(251,113,133,0.28),transparent_60%)]"
                        : currentHighlight.highlightTags.includes("six")
                          ? "bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.28),transparent_60%)]"
                          : "bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.24),transparent_60%)]"
                    }`}
                  />
                ) : null}
              </AnimatePresence>

              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="broadcast-label text-primary">Current Ball</div>
                    <div className="mt-3 text-4xl font-black text-white sm:text-5xl">
                      {currentFrame?.activeEvent
                        ? `Over ${currentFrame.activeEvent.over}.${currentFrame.activeEvent.ballInOver}`
                        : "Ready"}
                    </div>
                    <div className="mt-3 max-w-xl text-sm text-slate-200">
                      {currentFrame?.activeEvent
                        ? getReplayMomentCopy(currentFrame.activeEvent)
                        : "Press play to rebuild the innings ball by ball."}
                    </div>
                  </div>
                  <div className="rounded-[1.4rem] border border-primary/25 bg-primary/10 px-4 py-3 text-right">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Moment</div>
                    <div className="mt-2 text-2xl font-black text-white">
                      {getHighlightHeadline(currentFrame?.activeEvent ?? null)}
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFrame?.activeEvent ? `${currentFrame.activeEvent.inningsNumber}-${currentFrame.activeEvent.ballNumber}` : "idle"}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.97 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className={`mt-5 rounded-[1.5rem] border p-5 ${
                      currentFrame?.activeEvent?.highlightTags.includes("wicket")
                        ? "border-rose-400/35 bg-rose-500/15"
                        : currentFrame?.activeEvent?.highlightTags.includes("six")
                          ? "border-orange-400/35 bg-orange-500/15"
                          : currentFrame?.activeEvent?.highlightTags.includes("four")
                            ? "border-sky-400/35 bg-sky-500/15"
                            : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-100/80">
                      Delivery Result
                    </div>
                    <div className="mt-3 text-4xl font-black uppercase text-white">
                      {currentFrame?.activeEvent
                        ? currentFrame.activeEvent.result === "wicket"
                          ? "Wicket"
                          : `${currentFrame.activeEvent.runs} run${currentFrame.activeEvent.runs === 1 ? "" : "s"}`
                        : "Waiting"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(currentFrame?.activeEvent?.highlightTags ?? ["steady"]).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={spectatorHref}
                  className="rounded-full border border-sky-400/30 bg-sky-500/12 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-sky-100"
                >
                  Watch Live Room
                </Link>
                {returnHref && returnLabel ? (
                  <Link
                    href={returnHref}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-100"
                  >
                    {returnLabel}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsPlaying((value) => !value)}
                  className="rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setFrameIndex(0);
                  }}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white"
                >
                  Restart
                </button>
                {PLAYBACK_SPEEDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSpeed(value)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                      speed === value
                        ? "bg-white text-slate-950"
                        : "border border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    {value}x
                  </button>
                ))}
                {replay.segment.hasMore ? (
                  <button
                    type="button"
                    onClick={() => void loadMoreEvents()}
                    disabled={loadingMore}
                    className="rounded-full border border-sky-400/30 bg-sky-500/12 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-100 disabled:opacity-60"
                  >
                    {loadingMore ? "Loading More" : "Load More Overs"}
                  </button>
                ) : null}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>Seek Ball</span>
                  <span>
                    {currentFrame?.activeEvent
                      ? `${currentFrame.activeEvent.over}.${currentFrame.activeEvent.ballInOver}`
                      : "0.0"}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxFrameIndex}
                  value={Math.max(frameIndex, 0)}
                  onChange={(event) => {
                    setIsPlaying(false);
                    const next = Number(event.target.value);
                    setFrameIndex(next);
                    if (
                      replay.segment.hasMore &&
                      replay.segment.nextCursor !== null &&
                      next >= replay.events.length - 3
                    ) {
                      void loadMoreEvents();
                    }
                  }}
                  className="w-full accent-yellow-400"
                  disabled={replay.segment.totalEvents === 0}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>Loaded {replay.events.length} of {replay.segment.totalEvents}</span>
                <span>Playback is fully local after each segment arrives</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {replay.metadata.teams.map((team) => (
                <div key={team.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-black text-white">{team.name}</div>
                    <div className="text-sm text-slate-300">
                      {formatOvers(currentFrame?.teamScores[team.id].balls ?? 0)}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {replay.metadata.players
                      .filter((player) => player.teamId === team.id)
                      .map((player) => {
                        const stats = currentFrame?.playerStats[player.id] ?? {
                          runs: 0,
                          balls: 0,
                          wickets: 0,
                          runsConceded: 0,
                        };

                        return (
                          <div key={player.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 text-sm">
                            <div>
                              <div className="font-bold text-white">{player.name}</div>
                              <div className="text-slate-400">
                                {stats.runs}({stats.balls}) • {stats.wickets}/{stats.runsConceded}
                              </div>
                            </div>
                            <div className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                              {stats.balls > 0 || stats.wickets > 0 ? "Active" : "Idle"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="flex items-center justify-between">
              <h2 className="broadcast-title text-2xl text-white">Timeline</h2>
              <div className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-100">
                Over View
              </div>
            </div>
            <div className="mt-4 max-h-[42rem] space-y-4 overflow-y-auto pr-1 no-scrollbar">
              {visibleTimeline.map((over, index) => (
                <motion.div
                  key={`${over.inningsNumber}-${over.overNumber}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.26 }}
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
                      const entry = over.balls[ballIndex];
                      const event = entry?.event;
                      const indexInReplay = entry?.index;
                      const isActive = indexInReplay === frameIndex;

                      return (
                        <button
                          key={`${over.inningsNumber}-${over.overNumber}-${ballIndex}`}
                          type="button"
                          onClick={() => {
                            if (typeof indexInReplay !== "number") {
                              return;
                            }

                            setIsPlaying(false);
                            setFrameIndex(indexInReplay);
                          }}
                          disabled={!event}
                          className="flex flex-col items-center gap-2 disabled:cursor-default"
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-black transition-all ${
                              !event
                                ? "border-white/8 bg-transparent text-slate-700"
                                : event.result === "wicket"
                                  ? "border-rose-400 bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.28)]"
                                  : event.runs >= 4
                                    ? "border-orange-300 bg-orange-500/85 text-white shadow-[0_0_18px_rgba(249,115,22,0.24)]"
                                    : isActive
                                      ? "border-primary bg-primary/20 text-primary shadow-[0_0_18px_rgba(250,204,21,0.24)]"
                                      : event.highlightTags.length > 0
                                        ? "border-sky-300 bg-sky-500/20 text-sky-100"
                                        : "border-white/12 bg-white/10 text-white"
                            }`}
                            title={
                              event
                                ? `${event.batsmanName ?? "Batter"} vs ${event.bowlerName ?? "Bowler"}`
                                : "Ball pending"
                            }
                          >
                            {event ? (event.result === "wicket" ? "W" : event.runs) : ""}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            {ballIndex + 1}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function getHighlightHeadline(event: ReplayEvent | null) {
  if (!event) {
    return "Ready";
  }

  if (event.highlightTags.includes("wicket")) {
    return "Breakthrough";
  }

  if (event.highlightTags.includes("six")) {
    return "Maximum";
  }

  if (event.highlightTags.includes("four")) {
    return "Boundary";
  }

  if (event.highlightTags.includes("milestone")) {
    return "Milestone";
  }

  return "Build-up";
}

function getReplayMomentCopy(event: ReplayEvent) {
  const batterName = event.batsmanName ?? "Batter";
  const bowlerName = event.bowlerName ?? "Bowler";

  if (event.highlightTags.includes("wicket")) {
    return `${bowlerName} wins the moment and removes ${batterName} with a huge swing in momentum.`;
  }

  if (event.highlightTags.includes("six")) {
    return `${batterName} clears everything and sends the crowd into a frenzy.`;
  }

  if (event.highlightTags.includes("four")) {
    return `${batterName} finds the gap early and turns the pressure back on ${bowlerName}.`;
  }

  if (event.highlightTags.includes("milestone")) {
    return `${batterName} nudges the innings to another landmark as the chase keeps building.`;
  }

  if (event.runs <= 1) {
    return `${bowlerName} keeps things tight and forces a quieter ball in the sequence.`;
  }

  return `${batterName} adds useful runs and keeps the innings rhythm flowing.`;
}

type ReplayOverGroup = {
  inningsNumber: number;
  overNumber: number;
  balls: Array<{ event: ReplayEvent; index: number }>;
  totalRuns: number;
  wickets: number;
};

function buildReplayOvers(events: ReplayEvent[]) {
  const map = new Map<string, ReplayOverGroup>();

  events.forEach((event, index) => {
    const key = `${event.inningsNumber}-${event.over}`;
    const existing = map.get(key);

    if (existing) {
      existing.balls.push({ event, index });
      existing.totalRuns += event.runs;
      existing.wickets += event.result === "wicket" ? 1 : 0;
      return;
    }

    map.set(key, {
      inningsNumber: event.inningsNumber,
      overNumber: event.over,
      balls: [{ event, index }],
      totalRuns: event.runs,
      wickets: event.result === "wicket" ? 1 : 0,
    });
  });

  return [...map.values()]
    .map((over) => ({
      ...over,
      balls: [...over.balls].sort((a, b) => a.event.ballInOver - b.event.ballInOver),
    }))
    .sort((a, b) => {
      if (a.inningsNumber !== b.inningsNumber) {
        return b.inningsNumber - a.inningsNumber;
      }

      return b.overNumber - a.overNumber;
    });
}
