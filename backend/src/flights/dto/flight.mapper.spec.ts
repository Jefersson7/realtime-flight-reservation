import { FlightStatus } from '@shared/enums';
import { Flight } from '../domain/flight.entity';
import { toFlightDto } from './flight.mapper';

describe('toFlightDto', () => {
  it('maps a Flight entity to the shared FlightDto', () => {
    const flight = {
      id: 'f1',
      flightNumber: 'AR101',
      airline: 'Aerolineas Reales',
      origin: 'BOG',
      destination: 'MIA',
      departureAt: new Date('2026-10-01T10:00:00Z'),
      price: '350.00',
      status: FlightStatus.SCHEDULED,
    } as Flight;

    expect(toFlightDto(flight)).toEqual({
      id: 'f1',
      flightNumber: 'AR101',
      airline: 'Aerolineas Reales',
      origin: 'BOG',
      destination: 'MIA',
      departureAt: '2026-10-01T10:00:00.000Z',
      price: 350,
      status: FlightStatus.SCHEDULED,
    });
  });
});