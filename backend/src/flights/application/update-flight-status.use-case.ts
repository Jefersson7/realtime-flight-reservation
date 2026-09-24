import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FlightDto } from '@shared/dto';
import { FlightStatus } from '@shared/enums';
import {
  FLIGHT_REPOSITORY,
  FlightRepositoryPort,
} from '../ports/flight-repository.port';
import {
  REALTIME_NOTIFIER,
  RealtimeNotifierPort,
} from '../../realtime/ports/realtime-notifier.port';
import { toFlightDto } from '../dto/flight.mapper';

// The only flow in `flights` that goes through ports/application: it's the
// only one that mutates state and must notify in real time (ADR-003).
@Injectable()
export class UpdateFlightStatusUseCase {
  constructor(
    @Inject(FLIGHT_REPOSITORY)
    private readonly flightRepository: FlightRepositoryPort,
    @Inject(REALTIME_NOTIFIER)
    private readonly realtimeNotifier: RealtimeNotifierPort,
  ) {}

  async execute(flightId: string, status: FlightStatus): Promise<FlightDto> {
    const flight = await this.flightRepository.findById(flightId);
    if (!flight) {
      throw new NotFoundException(`Flight ${flightId} not found`);
    }

    const previousStatus = flight.status;
    flight.status = status;
    const saved = await this.flightRepository.save(flight);

    this.realtimeNotifier.notifyFlightStatusChanged({
      flightId: saved.id,
      previousStatus,
      status: saved.status,
      updatedAt: new Date().toISOString(),
    });

    return toFlightDto(saved);
  }
}
