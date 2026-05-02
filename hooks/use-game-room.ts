"use client";

import { useEffect, useMemo, useState } from "react";
import { emitWithAck, getGameSocket } from "@/lib/socket/game-socket";
import { GAME_CONSTANTS } from "@/lib/game/constants";
import {
  GAME_EVENTS,
  type PublicRoomState,
  type RoundResult,
  type SessionState,
  type TeamId,
} from "@/lib/game/contracts";
import { isValidRoomId } from "@/lib/game/room-id";

const storageKey = (roomId: string) => `hand-cricket:session:${roomId}`;

const USERNAME_KEY = "hand-cricket:username";
const USER_KEY = "user";

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function createActionId() {
  return crypto.randomUUID();
}

export function readStoredSession(roomId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(storageKey(roomId));
  const session = value ? (JSON.parse(value) as SessionState) : null;
  const globalUserValue = window.localStorage.getItem(USER_KEY);
  const globalUser = globalUserValue
    ? (JSON.parse(globalUserValue) as {
        userId?: string;
        roomId?: string;
        role?: "batter" | "bowler" | null;
        playerName?: string;
      })
    : null;

  if (session) {
    return session;
  }

  const globalName = window.localStorage.getItem(USERNAME_KEY);
  if (
    globalUser?.roomId === roomId &&
    globalUser.userId &&
    (globalUser.playerName || globalName)
  ) {
    return {
      roomId,
      playerId: globalUser.userId,
      playerName: globalUser.playerName ?? globalName ?? "",
      role: globalUser.role ?? null,
    } satisfies SessionState;
  }

  if (globalName) {
    return {
      roomId,
      playerId: "",
      playerName: globalName,
      role: null,
    } satisfies SessionState;
  }

  return null;
}

export function saveStoredSession(session: SessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(session.roomId), JSON.stringify(session));
  if (session.playerName) {
    window.localStorage.setItem(USERNAME_KEY, session.playerName);
  }
  window.localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: session.playerId,
      roomId: session.roomId,
      role: session.role ?? null,
      playerName: session.playerName,
    }),
  );
}

export function useGameRoom(roomId: string) {
  const hasValidRoomId = isValidRoomId(roomId);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  useEffect(() => {
    const session = readStoredSession(roomId);
    if (session) {
      setPlayerId(session.playerId || null);
      setPlayerName(session.playerName);
    } else if (typeof window !== "undefined") {
      const globalName = window.localStorage.getItem(USERNAME_KEY);
      if (globalName) setPlayerName(globalName);
    }
  }, [roomId]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), GAME_CONSTANTS.ERROR_DISPLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!hasValidRoomId) {
      return;
    }

    const socket = getGameSocket();

    const onConnect = async () => {
      setConnected(true);

      const session = readStoredSession(roomId);
      const nameToUse =
        session?.playerName ||
        (typeof window !== "undefined"
          ? window.localStorage.getItem(USERNAME_KEY)
          : null);

      if (session?.playerId || nameToUse) {
        try {
          const response = await emitWithAck<{
            ok: boolean;
            playerId: string;
            room?: PublicRoomState;
          }>(
            GAME_EVENTS.REJOIN_ROOM,
            {
              roomId,
              playerId: session?.playerId || undefined,
              playerName: nameToUse || undefined,
            },
          );

          if (response.ok && response.playerId && nameToUse) {
            setPlayerId(response.playerId);
            if (response.room) {
              setRoom(response.room);
            }
            saveStoredSession({
              roomId,
              playerId: response.playerId,
              playerName: nameToUse,
              role: session?.role ?? null,
            });
          }
        } catch (rejoinError) {
          setError(
            rejoinError instanceof Error ? rejoinError.message : "Unable to rejoin room.",
          );
        }
      }
    };

    const onDisconnect = () => setConnected(false);
    const onState = (nextRoom: PublicRoomState) => {
      if (!nextRoom) return;
      setRoom(nextRoom);

      const activePlayer =
        (playerId
          ? nextRoom.players.find((player) => player.id === playerId)
          : null) ??
        nextRoom.players.find(
          (player) =>
            !player.isBot &&
            normalizeName(player.name) === normalizeName(playerName),
        ) ??
        null;
      if (activePlayer) {
        if (activePlayer.id !== playerId) {
          setPlayerId(activePlayer.id);
        }
        const role =
          nextRoom.innings?.currentBatterId === activePlayer.id
            ? "batter"
            : nextRoom.innings?.currentBowlerId === activePlayer.id
              ? "bowler"
              : null;
        saveStoredSession({
          roomId: nextRoom.id,
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          role,
        });
      }

      const isTransition =
        nextRoom.status === "live" &&
        nextRoom.currentTurn === 0 &&
        nextRoom.innings?.number === 2;

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
    const onRound = (result: RoundResult) => {
      setRoom((prev) => {
        if (prev) {
          setRoundResult(result);
        }
        return prev;
      });
    };
    const onError = (payload: { message: string }) => setError(payload.message);
    const onPlayerDisconnected = (payload: { playerSocketId: string; playerName?: string }) => {
      if (payload.playerName) {
        setError(`Player "${payload.playerName}" left the game.`);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(GAME_EVENTS.GAME_STATE_UPDATE, onState);
    socket.on(GAME_EVENTS.ROUND_RESULT, onRound);
    socket.on(GAME_EVENTS.ERROR, onError);
    socket.on(GAME_EVENTS.PLAYER_DISCONNECTED, onPlayerDisconnected);
    socket.on(GAME_EVENTS.GAME_OVER, (payload: { reason?: string; winnerTeamId?: string }) => {
      if (payload.reason === 'playerLeft') {
        setError(`Game Ended: Opponent left the game.`);
      }
    });

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
      socket.off(GAME_EVENTS.PLAYER_DISCONNECTED, onPlayerDisconnected);
      socket.off(GAME_EVENTS.GAME_OVER, () => {});
    };
  }, [hasValidRoomId, playerId, playerName, roomId]);

  const me = useMemo(
    () =>
      room?.players.find((player) => player.id === playerId) ??
      room?.players.find(
        (player) =>
          !player.isBot &&
          normalizeName(player.name) === normalizeName(playerName),
      ) ??
      null,
    [playerId, playerName, room?.players],
  );

  const visibleRoundResult = useMemo(() => {
    if (!room || !roundResult) return null;
    const innings = room.innings;

    if (!innings || room.status !== "live") {
      return null;
    }

    if (roundResult.inningsNumber !== innings.number) {
      return null;
    }

    if (innings.pendingBowlerSelection) {
      return roundResult.isOut && roundResult.ballInOver === 6 ? roundResult : null;
    }

    const activeBatter = innings.currentBatterId
      ? room.players.find((player) => player.id === innings.currentBatterId) ?? null
      : null;
    const activeBowler = innings.currentBowlerId
      ? room.players.find((player) => player.id === innings.currentBowlerId) ?? null
      : null;
    const selectionInProgress = Boolean(
      activeBatter?.currentSelection !== null || activeBowler?.currentSelection !== null,
    );

    if (selectionInProgress) {
      return null;
    }

    if (
      innings.currentBowlerId &&
      innings.currentSpellBalls === 0 &&
      roundResult.ballInOver === 6
    ) {
      return null;
    }

    return roundResult.deliveryNumber === room.currentTurn ? roundResult : null;
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
      actionId: createActionId(),
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
