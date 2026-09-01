import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true
});

socket.on('connect', () => {
  console.log('⚡ Connected to HMS Realtime Socket.io server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from HMS Realtime Socket.io server');
});
