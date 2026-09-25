import { SeatDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import { Seat } from '../domain/seat.entity';
import { SeatLockOwner } from '../ports/seat-lock.port';

export function toSeatDto(seat: Seat, lock?: SeatLockOwner): SeatDto {
  return {
    id: seat.id,
    flightId: seat.flightId,
    row: seat.row,
    column: seat.column,
    seatNumber: seat.seatNumber,
    cabinClass: seat.cabinClass,
    status: lock ? SeatStatus.BLOCKED : seat.status,
    blockedBy: lock?.ownerId,
    blockExpiresAt: lock?.expiresAt,
  };
}
