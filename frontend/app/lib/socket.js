import { io } from "socket.io-client";

let socket;

export function connectSocket(token) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_COLLAB_BASE, {
      transports: ["websocket"],
      auth: { token },
      autoConnect: false // wait for explicit connect if needed, but here we usually want auto. 
      // Actually standard is autoConnect: true default.
    });
    // We can just connect.
    socket.connect();
  } else if (token) {
    // Update token if it changed
    socket.auth = { token };
    // If not connected, connect. If connected, maybe we don't need to reconnect unless auth failed?
    // But usually good to ensure we are using fresh token.
    if (!socket.connected) {
      socket.connect();
    }
  }
  return socket;
}

export function getSocket() {
  return socket;
}

