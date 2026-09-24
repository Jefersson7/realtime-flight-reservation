import { FlightDto } from '@shared/dto';
import { Flight } from '../domain/flight.entity';

export function toFlightDto(flight: Flight): FlightDto {
  return {
    id: flight.id,
    flightNumber: flight.flightNumber,
    airline: flight.airline,
    origin: flight.origin,
    destination: flight.destination,
    departureAt: flight.departureAt.toISOString(),
    price: Number(flight.price),
    status: flight.status,
  };
}
