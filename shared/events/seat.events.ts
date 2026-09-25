// Namespacing convention: '<domain>:<event>' (see flight.events.ts). `JOIN`/
// `LEAVE` are transport-level (per-flight Socket.io rooms), not domain
// events, but they live here since seats are the first feature to need
// rooms.
export const SEAT_EVENTS = {
  JOIN_FLIGHT: 'flight:join',
  LEAVE_FLIGHT: 'flight:leave',
  BLOCK: 'seat:block',
  RELEASE: 'seat:release',
  BLOCKED: 'seat:blocked',
  RELEASED: 'seat:released',
} as const;

export interface JoinFlightPayload {
  flightId: string;
}

// `clientId` is the stable per-tab identity (from sessionStorage) that owns
// the lock, NOT the socket id — the socket id changes on every reconnect,
// while the reservation must survive reconnects (see architecture.md §3).
export interface SeatBlockRequest {
  flightId: string;
  seatId: string;
  clientId: string;
}

export interface SeatReleaseRequest {
  flightId: string;
  seatId: string;
  clientId: string;
}

// Broadcast to everyone in `flight:{flightId}` (including the client that
// requested the block, so all UIs converge through the same code path).
export interface SeatBlockedPayload {
  flightId: string;
  seatId: string;
  blockedBy: string;
  expiresAt: string;
}

export interface SeatReleasedPayload {
  flightId: string;
  seatId: string;
}

// Ack shape returned to the caller of `seat:block` via the Socket.io
// callback (not broadcast — only the requester needs the failure reason).
export type SeatBlockAck =
  | { ok: true; seatId: string; blockedBy: string; expiresAt: string }
  | { ok: false; seatId: string; message: string };

export interface SeatReleaseAck {
  ok: boolean;
  message?: string;
}
