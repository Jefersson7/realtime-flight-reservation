import type { SeatLockPort } from '../ports/seat-lock.port';
import type { RealtimeNotifierPort } from '../../realtime/ports/realtime-notifier.port';
import { ReleaseSeatUseCase } from './release-seat.use-case';

describe('ReleaseSeatUseCase', () => {
  let seatLock: jest.Mocked<SeatLockPort>;
  let notifier: jest.Mocked<RealtimeNotifierPort>;
  let useCase: ReleaseSeatUseCase;

  beforeEach(() => {
    seatLock = { tryAcquire: jest.fn(), release: jest.fn(), getOwners: jest.fn() };
    notifier = {
      notifyFlightStatusChanged: jest.fn(),
      notifySeatBlocked: jest.fn(),
      notifySeatReleased: jest.fn(),
      notifySeatOccupied: jest.fn(),
    };
    useCase = new ReleaseSeatUseCase(seatLock, notifier);
  });

  it('notifies SEAT_RELEASED when the caller owned the lock', async () => {
    seatLock.release.mockResolvedValue(true);

    const result = await useCase.execute('f1', 's1', 'client-1');

    expect(seatLock.release).toHaveBeenCalledWith('s1', 'client-1');
    expect(notifier.notifySeatReleased).toHaveBeenCalledWith({ flightId: 'f1', seatId: 's1' });
    expect(result).toBe(true);
  });

  it('does not notify when the caller did not own the lock', async () => {
    seatLock.release.mockResolvedValue(false);

    const result = await useCase.execute('f1', 's1', 'client-1');

    expect(notifier.notifySeatReleased).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
