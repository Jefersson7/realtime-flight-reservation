import { io, Socket } from 'socket.io-client';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

// Single shared connection reused by any future hook (seats, bookings).
// The socket.io manager reconnects automatically by default; we expose the
// lifecycle state so the UI can warn when realtime updates are not flowing.
export const socket: Socket = io(import.meta.env.VITE_WS_URL, {
  autoConnect: true,
});

let socketStatus: SocketStatus = socket.connected ? 'connected' : 'connecting';
const listeners = new Set<(status: SocketStatus) => void>();

function setSocketStatus(next: SocketStatus): void {
  if (socketStatus === next) return;
  socketStatus = next;
  listeners.forEach((listener) => listener(next));
}

socket.on('connect', () => setSocketStatus('connected'));
socket.on('disconnect', () => setSocketStatus('disconnected'));
socket.on('connect_error', (error) => {
  console.warn('Socket connection lost, reconnecting…', error.message);
  setSocketStatus('disconnected');
});

export function getSocketStatus(): SocketStatus {
  return socketStatus;
}

export function subscribeSocketStatus(
  listener: (status: SocketStatus) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}