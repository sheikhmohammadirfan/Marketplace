import { io } from "socket.io-client";

const SOCKET_URL = "https://marketplace-api-7wwg.onrender.com";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      auth: (callback) => {
        fetch("/api/chat/socket-token", {
          credentials: "include",
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed to authenticate socket");
            return res.json();
          })
          .then(({ token }) => callback({ token }))
          .catch((err) => {
            console.error("Socket token error:", err);
            callback({});
          });
      },
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}