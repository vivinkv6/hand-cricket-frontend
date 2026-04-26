"use client";

import { io, type Socket } from "socket.io-client";
import { isValidRoomId } from "@/lib/game/room-id";
import { GAME_CONSTANTS } from "@/lib/game/constants";

let socket: Socket | null = null;

type AckErrorResponse = {
  ok?: false;
  message?: string;
};

type AckRoomResponse = {
  roomId?: unknown;
};

export function getGameSocket() {
  if (socket) {
    return socket;
  }

  socket = io(process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:5001", {
    autoConnect: false,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
  const activeSocket = getGameSocket();
  console.info("[socket] emit", { event, payload });

  return new Promise((resolve, reject) => {
    activeSocket.timeout(GAME_CONSTANTS.SOCKET_TIMEOUT_MS).emit(event, payload, (error: Error | null, response: T) => {
      if (error) {
        console.error("[socket] ack error", { event, error });
        reject(error);
        return;
      }

      console.info("[socket] ack", { event, response });

      const errorResponse = response as T & AckErrorResponse;
      if (errorResponse && errorResponse.ok === false) {
        reject(new Error(errorResponse.message ?? "Socket request failed."));
        return;
      }

      if (
        (event === "CREATE_ROOM" || event === "JOIN_ROOM" || event === "REJOIN_ROOM") &&
        !isValidRoomId((response as T & AckRoomResponse).roomId)
      ) {
        reject(new Error("Server returned an invalid room ID."));
        return;
      }

      resolve(response);
    });
  });
}
