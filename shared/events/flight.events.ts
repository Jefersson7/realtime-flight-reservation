import { FlightStatus } from '../enums';

// Namespacing convention: '<domain>:<event>'. Future files follow the same
// pattern: seat.events.ts (SEAT_EVENTS), booking.events.ts (BOOKING_EVENTS).
export const FLIGHT_EVENTS = {
  STATUS_CHANGED: 'flight:status_changed',
} as const;

export interface FlightStatusChangedPayload {
  flightId: string;
  previousStatus: FlightStatus;
  status: FlightStatus;
  updatedAt: string;
}
