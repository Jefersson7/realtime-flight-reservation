import { Inject, Injectable } from '@nestjs/common';
import { SEAT_LOCK, SeatLockPort } from '../ports/seat-lock.port';
import {
  REALTIME_NOTIFIER,
  RealtimeNotifierPort,
} from '../../realtime/ports/realtime-notifier.port';

@Injectable()
export class ReleaseSeatUseCase {
  constructor(
    @Inject(SEAT_LOCK)
    private readonly seatLock: SeatLockPort,
    @Inject(REALTIME_NOTIFIER)
    private readonly realtimeNotifier: RealtimeNotifierPort,
  ) {}

  // Returns false (and skips the notification) when `ownerId` doesn't hold
  // the lock — e.g. it already expired, or another client raced past this
  // one — so we never broadcast a release that didn't actually happen.
  async execute(flightId: string, seatId: string, ownerId: string): Promise<boolean> {
    const released = await this.seatLock.release(seatId, ownerId);
    if (released) {
      this.realtimeNotifier.notifySeatReleased({ flightId, seatId });
    }
    return released;
  }
}
