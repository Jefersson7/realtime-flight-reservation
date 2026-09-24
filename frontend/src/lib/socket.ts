import { io } from 'socket.io-client';

// Single shared connection reused by any future hook (seats, bookings).
export const socket = io(import.meta.env.VITE_WS_URL, { autoConnect: true });
