import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SeatStatus } from '@shared/enums';
import { Seat } from '../../seats/domain/seat.entity';
import { Booking } from '../domain/booking.entity';
import { generatePnr } from '../domain/pnr.util';
import { BookingRepositoryPort, ConfirmBookingInput } from '../ports/booking-repository.port';

const POSTGRES_UNIQUE_VIOLATION = '23505';
const MAX_PNR_ATTEMPTS = 5;

// Row-locks the seat inside the same transaction that inserts the Booking
// and flips it to OCCUPIED. This is the second half of the double-booking
// guard from architecture.md §3: the Redis lock stops two clients from
// blocking the same seat, this transaction stops two clients from both
// confirming it (e.g. a race right as the Redis TTL is about to expire).
@Injectable()
export class TypeOrmBookingRepository implements BookingRepositoryPort {
  constructor(private readonly dataSource: DataSource) {}

  async confirmBooking(input: ConfirmBookingInput): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      const seat = await manager.findOne(Seat, {
        where: { id: input.seatId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!seat || seat.status === SeatStatus.OCCUPIED) {
        throw new ConflictException(`Seat ${input.seatNumber} is already occupied`);
      }

      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_PNR_ATTEMPTS; attempt++) {
        try {
          const booking = manager.create(Booking, {
            pnr: generatePnr(),
            flightId: input.flightId,
            seatId: input.seatId,
            seatNumber: input.seatNumber,
            passengerName: input.passengerName,
            cardLast4: input.cardLast4,
            amount: input.amount.toFixed(2),
          });
          const saved = await manager.save(Booking, booking);
          await manager.update(Seat, input.seatId, { status: SeatStatus.OCCUPIED });
          return saved;
        } catch (error) {
          // Only a PNR collision is worth retrying with a freshly generated
          // code; any other failure should surface immediately.
          if ((error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION) {
            lastError = error;
            continue;
          }
          throw error;
        }
      }
      throw lastError instanceof Error ? lastError : new Error('No se pudo generar un PNR único');
    });
  }
}
