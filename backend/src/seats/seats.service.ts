import { Inject, Injectable } from '@nestjs/common';
import { SeatDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import { SEAT_REPOSITORY, SeatRepositoryPort } from './ports/seat-repository.port';
import { SEAT_LOCK, SeatLockPort } from './ports/seat-lock.port';
import { toSeatDto } from './dto/seat.mapper';

// Composes Postgres (persisted AVAILABLE/OCCUPIED) with Redis (the
// ephemeral BLOCKED overlay) to render the seat map, so it needs both
// ports even though it's a read (unlike FlightsService, which only touches
// one trivial boundary and skips ports per ADR-003).
@Injectable()
export class SeatsService {
  constructor(
    @Inject(SEAT_REPOSITORY)
    private readonly seatRepository: SeatRepositoryPort,
    @Inject(SEAT_LOCK)
    private readonly seatLock: SeatLockPort,
  ) {}

  async getSeatMap(flightId: string): Promise<SeatDto[]> {
    const seats = await this.seatRepository.findByFlightId(flightId);
    const availableSeatIds = seats
      .filter((seat) => seat.status === SeatStatus.AVAILABLE)
      .map((seat) => seat.id);

    const locks = await this.seatLock.getOwners(availableSeatIds);

    return seats.map((seat) => toSeatDto(seat, locks.get(seat.id)));
  }
}
