export interface SeatLockOwner {
  ownerId: string;
  expiresAt: string;
}

// Output port over the Redis-backed temporary lock. Kept separate from
// SeatRepositoryPort because it is a different volatile boundary (ADR-003):
// persistence writes vs. an atomic TTL lock.
export interface SeatLockPort {
  // Atomic acquire: only succeeds if the seat has no active lock (SET NX).
  tryAcquire(seatId: string, ownerId: string, ttlSeconds: number): Promise<boolean>;
  // Only releases if `ownerId` is the current lock holder, so one client
  // can never release a lock it doesn't own.
  release(seatId: string, ownerId: string): Promise<boolean>;
  // Batched lookup for rendering a seat map: which of the given seats are
  // currently locked, by whom, and until when.
  getOwners(seatIds: string[]): Promise<Map<string, SeatLockOwner>>;
}

export const SEAT_LOCK = Symbol('SEAT_LOCK');
