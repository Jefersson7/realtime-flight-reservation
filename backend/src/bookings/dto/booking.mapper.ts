import { BookingDto } from '@shared/dto';
import { Booking } from '../domain/booking.entity';

export function toBookingDto(booking: Booking): BookingDto {
  return {
    id: booking.id,
    pnr: booking.pnr,
    flightId: booking.flightId,
    seatId: booking.seatId,
    seatNumber: booking.seatNumber,
    passengerName: booking.passengerName,
    amount: Number(booking.amount),
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
  };
}
