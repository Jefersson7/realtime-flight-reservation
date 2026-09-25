import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BookingStatus, CabinClass, SeatStatus } from '@shared/enums';
import { Flight } from '../../flights/domain/flight.entity';
import { Seat } from '../../seats/domain/seat.entity';
import type { SeatRepositoryPort } from '../../seats/ports/seat-repository.port';
import type { SeatLockPort } from '../../seats/ports/seat-lock.port';
import type { RealtimeNotifierPort } from '../../realtime/ports/realtime-notifier.port';
import type { BookingRepositoryPort } from '../ports/booking-repository.port';
import { Booking } from '../domain/booking.entity';
import { ConfirmBookingUseCase } from './confirm-booking.use-case';

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'f1',
    flightNumber: 'AA123',
    airline: 'Test Air',
    origin: 'BOG',
    destination: 'MIA',
    departureAt: new Date(),
    price: '199.99',
    status: 'SCHEDULED',
    ...overrides,
  } as Flight;
}

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

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    pnr: 'K7QX2M',
    flightId: 'f1',
    seatId: 's1',
    seatNumber: '12A',
    passengerName: 'Jane Doe',
    cardLast4: '4242',
    amount: '199.99',
    status: BookingStatus.CONFIRMED,
    createdAt: new Date(),
    ...overrides,
  } as Booking;
}

describe('ConfirmBookingUseCase', () => {
  let flightRepository: jest.Mocked<Pick<Repository<Flight>, 'findOne'>>;
  let seatRepository: jest.Mocked<SeatRepositoryPort>;
  let seatLock: jest.Mocked<SeatLockPort>;
  let bookingRepository: jest.Mocked<BookingRepositoryPort>;
  let notifier: jest.Mocked<RealtimeNotifierPort>;
  let useCase: ConfirmBookingUseCase;

  const command = {
    flightId: 'f1',
    seatId: 's1',
    clientId: 'client-1',
    cardHolderName: 'Jane Doe',
    cardNumber: '4111111111114242',
  };

  beforeEach(() => {
    flightRepository = { findOne: jest.fn() };
    seatRepository = { findByFlightId: jest.fn(), findById: jest.fn() };
    seatLock = { tryAcquire: jest.fn(), release: jest.fn(), getOwners: jest.fn() };
    bookingRepository = { confirmBooking: jest.fn() };
    notifier = {
      notifyFlightStatusChanged: jest.fn(),
      notifySeatBlocked: jest.fn(),
      notifySeatReleased: jest.fn(),
      notifySeatOccupied: jest.fn(),
    };
    useCase = new ConfirmBookingUseCase(
      flightRepository as unknown as Repository<Flight>,
      seatRepository,
      seatLock,
      bookingRepository,
      notifier,
    );
  });

  it('throws NotFoundException when the flight does not exist', async () => {
    flightRepository.findOne.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(NotFoundException);
    expect(seatRepository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the seat does not exist on the flight', async () => {
    flightRepository.findOne.mockResolvedValue(makeFlight());
    seatRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when the seat is already occupied', async () => {
    flightRepository.findOne.mockResolvedValue(makeFlight());
    seatRepository.findById.mockResolvedValue(makeSeat({ status: SeatStatus.OCCUPIED }));

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(ConflictException);
    expect(seatLock.getOwners).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the caller does not hold the current lock', async () => {
    flightRepository.findOne.mockResolvedValue(makeFlight());
    seatRepository.findById.mockResolvedValue(makeSeat());
    seatLock.getOwners.mockResolvedValue(
      new Map([['s1', { ownerId: 'someone-else', expiresAt: new Date().toISOString() }]]),
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(ForbiddenException);
    expect(bookingRepository.confirmBooking).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the lock has already expired (no owner)', async () => {
    flightRepository.findOne.mockResolvedValue(makeFlight());
    seatRepository.findById.mockResolvedValue(makeSeat());
    seatLock.getOwners.mockResolvedValue(new Map());

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('confirms the booking, releases the lock and notifies SEAT_OCCUPIED', async () => {
    flightRepository.findOne.mockResolvedValue(makeFlight());
    seatRepository.findById.mockResolvedValue(makeSeat());
    seatLock.getOwners.mockResolvedValue(
      new Map([['s1', { ownerId: 'client-1', expiresAt: new Date().toISOString() }]]),
    );
    bookingRepository.confirmBooking.mockResolvedValue(makeBooking());
    seatLock.release.mockResolvedValue(true);

    const result = await useCase.execute(command);

    expect(bookingRepository.confirmBooking).toHaveBeenCalledWith({
      flightId: 'f1',
      seatId: 's1',
      seatNumber: '12A',
      passengerName: 'Jane Doe',
      cardLast4: '4242',
      amount: 199.99,
    });
    expect(seatLock.release).toHaveBeenCalledWith('s1', 'client-1');
    expect(notifier.notifySeatOccupied).toHaveBeenCalledWith({
      flightId: 'f1',
      seatId: 's1',
      pnr: 'K7QX2M',
    });
    expect(result).toEqual({
      id: 'b1',
      pnr: 'K7QX2M',
      flightId: 'f1',
      seatId: 's1',
      seatNumber: '12A',
      passengerName: 'Jane Doe',
      amount: 199.99,
      status: BookingStatus.CONFIRMED,
      createdAt: expect.any(String),
    });
  });

  it('does not fail the confirmation when the Redis lock already expired concurrently', async () => {
    flightRepository.findOne.mockResolvedValue(makeFlight());
    seatRepository.findById.mockResolvedValue(makeSeat());
    seatLock.getOwners.mockResolvedValue(
      new Map([['s1', { ownerId: 'client-1', expiresAt: new Date().toISOString() }]]),
    );
    bookingRepository.confirmBooking.mockResolvedValue(makeBooking());
    seatLock.release.mockResolvedValue(false);

    await expect(useCase.execute(command)).resolves.toBeDefined();
    expect(notifier.notifySeatOccupied).toHaveBeenCalled();
  });
});
