"use client";

import { useParams, useSearchParams } from "next/navigation";
import { MatchReplay } from "@/components/game/match-replay";

export default function ReplayPage() {
  const params = useParams<{ matchId?: string | string[] }>();
  const searchParams = useSearchParams();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;
  const returnToParam = searchParams.get("returnTo");
  const returnTo =
    returnToParam === "room" || returnToParam === "spectate"
      ? returnToParam
      : null;

  if (!matchId) {
    return null;
  }

  return <MatchReplay matchId={matchId} returnTo={returnTo} />;
}
