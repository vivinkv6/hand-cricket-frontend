"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useEffect, useRef, useState } from "react";
import { LiveMatch } from "@/components/game/live-match";
import { MatchResultScreen } from "@/components/game/match-result-screen";
import { RoomLobby } from "@/components/game/room-lobby";
import { useGameRoom } from "@/hooks/use-game-room";
import { useSoundEffects } from "@/hooks/use-sound-effects";

export function GameRoom({ roomId }: { roomId: string }) {
  const { room, me, error, connected, roundResult, actions } = useGameRoom(roomId);
  const [showWicketTransition, setShowWicketTransition] = useState(false);
  const effectiveRoundResult = useMemo(
    () =>
      showWicketTransition && room?.lastRoundResult?.isOut
        ? room.lastRoundResult
        : room?.lastRoundResult ?? roundResult,
    [roundResult, room?.lastRoundResult, showWicketTransition],
  );
const { playClick } = useSoundEffects({
    roundResult: effectiveRoundResult,
    result: room?.result ?? null,
    myTeamId: me?.teamId,
  });
  const didAutoStartSolo = useRef(false);

  useEffect(() => {
    if (!room || !me) {
      return;
    }

    if (
      room.mode === "solo" &&
      room.status === "ready" &&
      me.isCaptain &&
      !didAutoStartSolo.current
    ) {
      didAutoStartSolo.current = true;
      void actions.startGame();
    }

    if (room.mode !== "solo" || room.status === "completed") {
      didAutoStartSolo.current = false;
    }
  }, [actions, me, room]);

  useEffect(() => {
    if (!room?.lastRoundResult?.isOut) {
      setShowWicketTransition(false);
      return;
    }

    const shouldHoldForWicketTransition =
      room.status === "completed" ||
      room.status === "inningsBreak" ||
      (room.status === "live" &&
        ((room.innings?.pendingBowlerSelection &&
          room.lastRoundResult.ballInOver === 6) ||
          (room.innings?.number === 2 && room.currentTurn === 0)));

    if (!shouldHoldForWicketTransition) {
      setShowWicketTransition(false);
      return;
    }

    setShowWicketTransition(true);
    const timer = window.setTimeout(() => {
      setShowWicketTransition(false);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [
    room?.currentTurn,
    room?.innings?.number,
    room?.innings?.pendingBowlerSelection,
    room?.lastRoundResult?.ballInOver,
    room?.lastRoundResult?.deliveryNumber,
    room?.lastRoundResult?.isOut,
    room?.status,
  ]);

  if (!room || !me) {
    return (
      <main className="stadium-shell flex min-h-screen items-center justify-center px-4 text-white">
        <div className="glass-panel max-w-lg rounded-[2rem] p-8 text-center">

          <p className="broadcast-title text-4xl text-indigo-300">Loading Match</p>
          <p className="mt-3 text-lg text-slate-200/78">
            Bringing your room back onto the field.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-white/8 px-5 py-3 text-sm uppercase tracking-[0.18em] text-white"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  if (room.status === "completed" && !showWicketTransition) {
    return (
      <MatchResultScreen
        room={room}
        me={me}
        connected={connected}
        error={error}
        playClick={playClick}
        actions={actions}
      />
    );
  }

  if (room.status === "live" || room.status === "inningsBreak" || showWicketTransition) {
    return (
      <LiveMatch
        room={room}
        me={me}
        connected={connected}
        error={error}
        roundResult={effectiveRoundResult}
        playClick={playClick}
        actions={actions}
      />
    );
  }

  return (
    <RoomLobby
      room={room}
      me={me}
      connected={connected}
      error={error}
      playClick={playClick}
      actions={actions}
    />
  );
}
