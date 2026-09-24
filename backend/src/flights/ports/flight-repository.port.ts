import { Flight } from '../domain/flight.entity';

export interface FlightRepositoryPort {
  findById(id: string): Promise<Flight | null>;
  save(flight: Flight): Promise<Flight>;
}

export const FLIGHT_REPOSITORY = Symbol('FLIGHT_REPOSITORY');
