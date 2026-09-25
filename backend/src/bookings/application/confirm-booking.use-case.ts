import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import { Flight } from '../../flights/domain/flight.entity';
import { SEAT_REPOSITORY, SeatRepositoryPort } from '../../seats/ports/seat-repository.port';
import { SEAT_LOCK, SeatLockPort } from '../../seats/ports/seat-lock.port';
import {
  REALTIME_NOTIFIER,
  RealtimeNotifierPort,
} from '../../realtime/ports/realtime-notifier.port';
import { BOOKING_REPOSITORY, BookingRepositoryPort } from '../ports/booking-repository.port';
import { toBookingDto } from '../dto/booking.mapper';

export interface ConfirmBookingCommand {
  flightId: string;
  seatId: string;
  clientId: string;
  cardHolderName: string;
  cardNumber: string;
}

@Injectable()
export class ConfirmBookingUseCase {
  constructor(
    // Read-only lookup for the flight price — direct repository injection,
    // no port, same rationale FlightsService already documents (ADR-003).
    @InjectRepository(Flight)
    private readonly flightRepository: Repository<Flight>,
    @Inject(SEAT_REPOSITORY)
    private readonly seatRepository: SeatRepositoryPort,
    @Inject(SEAT_LOCK)
    private readonly seatLock: SeatLockPort,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepositoryPort,
    @Inject(REALTIME_NOTIFIER)
    private readonly realtimeNotifier: RealtimeNotifierPort,
  ) {}

  async execute(command: ConfirmBookingCommand): Promise<BookingDto> {
    const { flightId, seatId, clientId, cardHolderName, cardNumber } = command;

    const flight = await this.flightRepository.findOne({ where: { id: flightId } });
    if (!flight) {
      throw new NotFoundException(`Flight ${flightId} not found`);
    }

    const seat = await this.seatRepository.findById(seatId);
    if (!seat || seat.flightId !== flightId) {
      throw new NotFoundException(`Seat ${seatId} not found on flight ${flightId}`);
    }
    if (seat.status === SeatStatus.OCCUPIED) {
      throw new ConflictException(`Seat ${seat.seatNumber} is already occupied`);
    }

    // Whoever confirms must be the client currently holding the temporary
    // Redis lock — otherwise anyone could confirm a seat someone else is
    // mid-payment on (architecture.md §3, ownership by stable clientId).
    const owners = await this.seatLock.getOwners([seatId]);
    const owner = owners.get(seatId);
    if (!owner || owner.ownerId !== clientId) {
      throw new ForbiddenException('No tienes el bloqueo vigente de este asiento');
    }

    const booking = await this.bookingRepository.confirmBooking({
      flightId,
      seatId,
      seatNumber: seat.seatNumber,
      passengerName: cardHolderName,
      cardLast4: cardNumber.slice(-4),
      amount: Number(flight.price),
    });

    // Best-effort: the transaction above is the real source of truth for
    // "this seat is taken now", so a Redis key that already expired
    // concurrently must not fail an otherwise-successful confirmation.
    await this.seatLock.release(seatId, clientId);
    this.realtimeNotifier.notifySeatOccupied({ flightId, seatId, pnr: booking.pnr });

    return toBookingDto(booking);
  }
}
