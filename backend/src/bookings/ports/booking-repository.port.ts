import { Booking } from '../domain/booking.entity';

export interface ConfirmBookingInput {
  flightId: string;
  seatId: string;
  seatNumber: string;
  passengerName: string;
  cardLast4: string;
  amount: number;
}

// Output port over the write side of a booking confirmation. Deliberately
// exposes a single coarse-grained operation (not `save`/`findById`) because
// the whole point is that creating the Booking and flipping Seat.status to
// OCCUPIED happen inside one Postgres transaction (see architecture.md §3).
export interface BookingRepositoryPort {
  // Throws ConflictException if the seat is already OCCUPIED under a row
  // lock, closing the race window left by the Redis TTL.
  confirmBooking(input: ConfirmBookingInput): Promise<Booking>;
}

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
