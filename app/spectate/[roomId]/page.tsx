"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { GameRoom } from "@/components/game/game-room";
import { isValidRoomId, normalizeRoomId } from "@/lib/game/room-id";

export default function SpectateRoomPage() {
  const params = useParams<{ roomId?: string | string[] }>();
  const rawRoomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  if (!isValidRoomId(rawRoomId)) {
    return (
      <main className="stadium-shell flex min-h-screen items-center justify-center px-4 text-white">
        <div className="glass-panel max-w-lg rounded-[2rem] p-8 text-center">
          <p className="broadcast-title text-4xl text-amber-300">Invalid Room</p>
          <p className="mt-3 text-lg text-slate-200/78">
            That spectator link does not contain a valid room ID.
          </p>
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

  return <GameRoom roomId={normalizeRoomId(rawRoomId)} spectator />;
}
