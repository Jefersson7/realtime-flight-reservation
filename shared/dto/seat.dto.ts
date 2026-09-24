import { CabinClass, SeatStatus } from '../enums';

export interface SeatDto {
  id: string;
  flightId: string;
  row: number;
  column: string;
  seatNumber: string;
  cabinClass: CabinClass;
  status: SeatStatus;
  // Only set when status === BLOCKED: who holds the temporary lock and when
  // it expires, so the UI can tell "blocked by me" from "blocked by someone
  // else" and render a countdown.
  blockedBy?: string;
  blockExpiresAt?: string;
}
