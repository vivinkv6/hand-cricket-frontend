"use client";

import { useEffect, useMemo, useState } from "react";
import { emitWithAck, getGameSocket } from "@/lib/socket/game-socket";
import {
  GAME_EVENTS,
  type PublicRoomState,
  type RoundResult,
  type SessionState,
  type TeamId,
} from "@/lib/game/contracts";
import { isValidRoomId } from "@/lib/game/room-id";

const storageKey = (roomId: string) => `hand-cricket:session:${roomId}`;

export function readStoredSession(roomId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(storageKey(roomId));
  return value ? (JSON.parse(value) as SessionState) : null;
}

export function saveStoredSession(session: SessionState) {
  window.localStorage.setItem(storageKey(session.roomId), JSON.stringify(session));
}

export function useGameRoom(roomId: string) {
  const storedSession = useMemo(() => readStoredSession(roomId), [roomId]);
  const hasValidRoomId = isValidRoomId(roomId);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [playerId] = useState<string | null>(storedSession?.playerId ?? null);
  const [playerName] = useState<string>(storedSession?.playerName ?? "");
  const [error, setError] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!hasValidRoomId) {
      return;
    }


    const socket = getGameSocket();

    const onConnect = async () => {
      setConnected(true);

      if (storedSession) {
        try {
          console.info("[room] rejoin attempt", {
            roomId,
            playerId: storedSession.playerId,
          });
          await emitWithAck(GAME_EVENTS.REJOIN_ROOM, {
            roomId,
            playerId: storedSession.playerId,
          });
        } catch (rejoinError) {
          setError(
            rejoinError instanceof Error ? rejoinError.message : "Unable to rejoin room.",
          );
        }
      }
    };

    const onDisconnect = () => setConnected(false);
    const onState = (nextRoom: PublicRoomState) => {
      setRoom(nextRoom);

      const isTransition = nextRoom.status === "live" && nextRoom.currentTurn === 0 && nextRoom.innings?.number === 2;
      
      if (
        nextRoom.status !== "live" ||
        (nextRoom.currentTurn === 0 && !isTransition) ||
        !nextRoom.lastRoundResult
      ) {
        setRoundResult(null);
        return;
      }

      setRoundResult(nextRoom.lastRoundResult);
    };
    const onRound = (result: RoundResult) => setRoundResult(result);
    const onError = (payload: { message: string }) => setError(payload.message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(GAME_EVENTS.GAME_STATE_UPDATE, onState);
    socket.on(GAME_EVENTS.ROUND_RESULT, onRound);
    socket.on(GAME_EVENTS.ERROR, onError);

    if (!socket.connected) {
      socket.connect();
    } else {
      void onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(GAME_EVENTS.GAME_STATE_UPDATE, onState);
      socket.off(GAME_EVENTS.ROUND_RESULT, onRound);
      socket.off(GAME_EVENTS.ERROR, onError);
    };
  }, [hasValidRoomId, roomId, storedSession]);

  const me = useMemo(
    () => room?.players.find((player) => player.id === playerId) ?? null,
    [playerId, room?.players],
  );

  const visibleRoundResult = useMemo(() => {
    const isTransitioning = room?.status === "live" && room?.currentTurn === 0 && room?.innings?.number === 2;

    if (
      !room ||
      room.status !== "live" ||
      (!roundResult && !isTransitioning) ||
      (roundResult && roundResult.deliveryNumber !== room.currentTurn && !isTransitioning) ||
      (room.innings?.currentSpellBalls === 0 && !room.innings?.pendingBowlerSelection && !isTransitioning)
    ) {
      if (!isTransitioning) return null;
    }

    return roundResult;
  }, [room, roundResult]);

  const runAction = async (event: string, payload: Record<string, unknown>) => {
    if (!isValidRoomId(roomId)) {
      throw new Error("Invalid room ID.");
    }

    setError("");
    setRoundResult(null);

    await emitWithAck(event, {
      roomId,
      playerId,
      ...payload,
    });
  };

  return {
    room,
    me,
    playerId,
    playerName,
    error: hasValidRoomId ? error : "Invalid room ID.",
    connected,
    roundResult: visibleRoundResult,
    setError,
    actions: {
      startGame: () => runAction(GAME_EVENTS.START_GAME, {}),
      selectNumber: (number: number) => runAction(GAME_EVENTS.SELECT_NUMBER, { number }),
      selectBowler: (bowlerId: string) =>
        runAction(GAME_EVENTS.SELECT_BOWLER, { bowlerId }),
      selectToss: (choice: "bat" | "bowl") =>
        runAction(GAME_EVENTS.SELECT_TOSS, { choice }),
      requestRematch: (preference: "same" | "swap") =>
        runAction(GAME_EVENTS.REMATCH_REQUEST, { preference }),
      swapTeam: (targetTeamId: TeamId) =>
        runAction(GAME_EVENTS.TEAM_SWAP, { targetTeamId }),
      renameTeam: (teamId: TeamId, name: string) =>
        runAction(GAME_EVENTS.RENAME_TEAM, { teamId, name }),
    },
  };
}
