"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LiveMatch } from "@/components/game/live-match";
import { MatchResultScreen } from "@/components/game/match-result-screen";
import { RoomLobby } from "@/components/game/room-lobby";
import { useGameRoom } from "@/hooks/use-game-room";
import { useSoundEffects } from "@/hooks/use-sound-effects";

export function GameRoom({ roomId }: { roomId: string }) {
  const { room, me, error, connected, roundResult, actions } = useGameRoom(roomId);
  const { playClick } = useSoundEffects({
    roundResult,
    result: room?.result ?? null,
    myTeamId: me?.teamId,
  });
  const [teamDraftName, setTeamDraftName] = useState("");
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

  if (room.status === "completed") {
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

  if (room.status === "live" || room.status === "inningsBreak") {
    return (
      <LiveMatch
        room={room}
        me={me}
        connected={connected}
        error={error}
        roundResult={roundResult}
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
      teamDraftName={teamDraftName}
      setTeamDraftName={setTeamDraftName}
      actions={actions}
    />
  );
}
