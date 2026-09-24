import { NotFoundException } from '@nestjs/common';
import { FlightStatus } from '@shared/enums';
import { Flight } from '../domain/flight.entity';
import type { FlightRepositoryPort } from '../ports/flight-repository.port';
import type { RealtimeNotifierPort } from '../../realtime/ports/realtime-notifier.port';
import { UpdateFlightStatusUseCase } from './update-flight-status.use-case';

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'f1',
    flightNumber: 'AR101',
    airline: 'Aerolineas Reales',
    origin: 'BOG',
    destination: 'MIA',
    departureAt: new Date('2026-10-01T10:00:00Z'),
    price: '350.00',
    status: FlightStatus.SCHEDULED,
    ...overrides,
  } as Flight;
}

describe('UpdateFlightStatusUseCase', () => {
  let repository: jest.Mocked<FlightRepositoryPort>;
  let notifier: jest.Mocked<RealtimeNotifierPort>;
  let useCase: UpdateFlightStatusUseCase;

  beforeEach(() => {
    repository = { findById: jest.fn(), save: jest.fn() };
    notifier = { notifyFlightStatusChanged: jest.fn() };
    useCase = new UpdateFlightStatusUseCase(repository, notifier);
  });

  it('throws NotFoundException when the flight does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-id', FlightStatus.CANCELLED),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(notifier.notifyFlightStatusChanged).not.toHaveBeenCalled();
  });

  it('persists the new status and notifies with previous/next status', async () => {
    const flight = makeFlight();
    repository.findById.mockResolvedValue(flight);
    repository.save.mockImplementation(async (saved) => saved);

    const result = await useCase.execute('f1', FlightStatus.DELAYED);

    expect(repository.save).toHaveBeenCalledWith({
      ...flight,
      status: FlightStatus.DELAYED,
    });
    expect(notifier.notifyFlightStatusChanged).toHaveBeenCalledWith({
      flightId: 'f1',
      previousStatus: FlightStatus.SCHEDULED,
      status: FlightStatus.DELAYED,
      updatedAt: expect.any(String),
    });
    expect(result.status).toBe(FlightStatus.DELAYED);
  });

  it('does not notify when persistence fails', async () => {
    repository.findById.mockResolvedValue(makeFlight());
    repository.save.mockRejectedValue(new Error('database unavailable'));

    await expect(
      useCase.execute('f1', FlightStatus.CANCELLED),
    ).rejects.toThrow('database unavailable');
    expect(notifier.notifyFlightStatusChanged).not.toHaveBeenCalled();
  });
});