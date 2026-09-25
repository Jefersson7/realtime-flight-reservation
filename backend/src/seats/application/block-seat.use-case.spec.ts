import { ConflictException, NotFoundException } from '@nestjs/common';
import { CabinClass, SeatStatus } from '@shared/enums';
import { Seat } from '../domain/seat.entity';
import type { SeatRepositoryPort } from '../ports/seat-repository.port';
import type { SeatLockPort } from '../ports/seat-lock.port';
import type { RealtimeNotifierPort } from '../../realtime/ports/realtime-notifier.port';
import { BlockSeatUseCase, SEAT_LOCK_TTL_SECONDS } from './block-seat.use-case';

function makeSeat(overrides: Partial<Seat> = {}): Seat {
  return {
    id: 's1',
    flightId: 'f1',
    row: 12,
    column: 'A',
    seatNumber: '12A',
    cabinClass: CabinClass.ECONOMY,
    status: SeatStatus.AVAILABLE,
    ...overrides,
  } as Seat;
}

describe('BlockSeatUseCase', () => {
  let seatRepository: jest.Mocked<SeatRepositoryPort>;
  let seatLock: jest.Mocked<SeatLockPort>;
  let notifier: jest.Mocked<RealtimeNotifierPort>;
  let useCase: BlockSeatUseCase;

  beforeEach(() => {
    seatRepository = { findByFlightId: jest.fn(), findById: jest.fn() };
    seatLock = { tryAcquire: jest.fn(), release: jest.fn(), getOwners: jest.fn() };
    notifier = {
      notifyFlightStatusChanged: jest.fn(),
      notifySeatBlocked: jest.fn(),
      notifySeatReleased: jest.fn(),
    };
    useCase = new BlockSeatUseCase(seatRepository, seatLock, notifier);
  });

  it('throws NotFoundException when the seat does not exist on the flight', async () => {
    seatRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('f1', 's1', 'client-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(seatLock.tryAcquire).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the seat belongs to a different flight', async () => {
    seatRepository.findById.mockResolvedValue(makeSeat({ flightId: 'other-flight' }));

    await expect(useCase.execute('f1', 's1', 'client-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ConflictException when the seat is already occupied', async () => {
    seatRepository.findById.mockResolvedValue(makeSeat({ status: SeatStatus.OCCUPIED }));

    await expect(useCase.execute('f1', 's1', 'client-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(seatLock.tryAcquire).not.toHaveBeenCalled();
  });

  it('throws ConflictException when another client already holds the lock', async () => {
    seatRepository.findById.mockResolvedValue(makeSeat());
    seatLock.tryAcquire.mockResolvedValue(false);

    await expect(useCase.execute('f1', 's1', 'client-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(notifier.notifySeatBlocked).not.toHaveBeenCalled();
  });

  it('acquires the lock and notifies with an expiry timestamp', async () => {
    seatRepository.findById.mockResolvedValue(makeSeat());
    seatLock.tryAcquire.mockResolvedValue(true);

    const before = Date.now();
    const result = await useCase.execute('f1', 's1', 'client-1');
    const after = Date.now();

    expect(seatLock.tryAcquire).toHaveBeenCalledWith('s1', 'client-1', SEAT_LOCK_TTL_SECONDS);
    expect(result).toEqual({
      seatId: 's1',
      blockedBy: 'client-1',
      expiresAt: expect.any(String),
    });

    const expiresAtMs = new Date(result.expiresAt).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + SEAT_LOCK_TTL_SECONDS * 1000);
    expect(expiresAtMs).toBeLessThanOrEqual(after + SEAT_LOCK_TTL_SECONDS * 1000);

    expect(notifier.notifySeatBlocked).toHaveBeenCalledWith({
      flightId: 'f1',
      seatId: 's1',
      blockedBy: 'client-1',
      expiresAt: result.expiresAt,
    });
  });
});
