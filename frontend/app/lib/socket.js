import { io } from "socket.io-client";

let socket;

export function connectSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_COLLAB_BASE, {
      transports: ["websocket"],
    });
  }
  return socket;
}

export function getSocket() {
  return socket;
}
