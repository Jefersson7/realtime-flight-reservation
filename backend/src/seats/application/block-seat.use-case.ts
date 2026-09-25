import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SeatStatus } from '@shared/enums';
import { SEAT_REPOSITORY, SeatRepositoryPort } from '../ports/seat-repository.port';
import { SEAT_LOCK, SeatLockPort } from '../ports/seat-lock.port';
import {
  REALTIME_NOTIFIER,
  RealtimeNotifierPort,
} from '../../realtime/ports/realtime-notifier.port';

export interface BlockSeatResult {
  seatId: string;
  blockedBy: string;
  expiresAt: string;
}

// 10 minutes, matching the "mientras completo mis datos de pago" window
// from the user story and ADR's documented TTL.
export const SEAT_LOCK_TTL_SECONDS = 600;

@Injectable()
export class BlockSeatUseCase {
  constructor(
    @Inject(SEAT_REPOSITORY)
    private readonly seatRepository: SeatRepositoryPort,
    @Inject(SEAT_LOCK)
    private readonly seatLock: SeatLockPort,
    @Inject(REALTIME_NOTIFIER)
    private readonly realtimeNotifier: RealtimeNotifierPort,
  ) {}

  async execute(flightId: string, seatId: string, ownerId: string): Promise<BlockSeatResult> {
    const seat = await this.seatRepository.findById(seatId);
    if (!seat || seat.flightId !== flightId) {
      throw new NotFoundException(`Seat ${seatId} not found on flight ${flightId}`);
    }
    if (seat.status === SeatStatus.OCCUPIED) {
      throw new ConflictException(`Seat ${seat.seatNumber} is already occupied`);
    }

    const acquired = await this.seatLock.tryAcquire(seatId, ownerId, SEAT_LOCK_TTL_SECONDS);
    if (!acquired) {
      throw new ConflictException(`Seat ${seat.seatNumber} is currently blocked by another passenger`);
    }

    const expiresAt = new Date(Date.now() + SEAT_LOCK_TTL_SECONDS * 1000).toISOString();

    this.realtimeNotifier.notifySeatBlocked({ flightId, seatId, blockedBy: ownerId, expiresAt });

    return { seatId, blockedBy: ownerId, expiresAt };
  }
}
