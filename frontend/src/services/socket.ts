import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const BACKEND_URL = 'http://localhost:5000';

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io(BACKEND_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
