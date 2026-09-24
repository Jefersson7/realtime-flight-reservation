import { Seat } from '../domain/seat.entity';

export interface SeatRepositoryPort {
  findByFlightId(flightId: string): Promise<Seat[]>;
  findById(id: string): Promise<Seat | null>;
}

export const SEAT_REPOSITORY = Symbol('SEAT_REPOSITORY');
