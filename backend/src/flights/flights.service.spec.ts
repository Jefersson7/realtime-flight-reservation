import { FlightStatus } from '@shared/enums';
import { Flight } from './domain/flight.entity';
import { FlightsService } from './flights.service';
import type { Repository } from 'typeorm';

interface FakeQueryBuilder {
  conditions: Record<string, unknown>;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  getMany: jest.Mock;
}

function makeQueryBuilder(results: Flight[]): FakeQueryBuilder {
  const qb: FakeQueryBuilder = {
    conditions: {},
    andWhere: jest.fn(function (
      this: FakeQueryBuilder,
      sql: string,
      params: Record<string, unknown>,
    ) {
      this.conditions[sql] = params;
      return this;
    }),
    orderBy: jest.fn(function (this: FakeQueryBuilder) {
      return this;
    }),
    getMany: jest.fn(async () => results),
  };
  return qb;
}

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

describe('FlightsService.search', () => {
  function serviceWith(qb: FakeQueryBuilder): FlightsService {
    const repository = {
      createQueryBuilder: jest.fn(() => qb),
    } as unknown as Repository<Flight>;
    return new FlightsService(repository);
  }

  it('returns mapped flights without filters when the query is empty', async () => {
    const qb = makeQueryBuilder([makeFlight()]);
    const service = serviceWith(qb);

    const result = await service.search({});

    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('flight.departureAt', 'ASC');
    expect(result).toEqual([
      {
        id: 'f1',
        flightNumber: 'AR101',
        airline: 'Aerolineas Reales',
        origin: 'BOG',
        destination: 'MIA',
        departureAt: '2026-10-01T10:00:00.000Z',
        price: 350,
        status: FlightStatus.SCHEDULED,
      },
    ]);
  });

  it('applies each present filter with its bound parameter', async () => {
    const qb = makeQueryBuilder([]);
    const service = serviceWith(qb);

    const result = await service.search({
      origin: 'BOG',
      destination: 'MIA',
      date: '2026-10-01',
    });

    expect(qb.andWhere).toHaveBeenCalledTimes(3);
    expect(qb.conditions['flight.origin = :origin']).toEqual({
      origin: 'BOG',
    });
    expect(qb.conditions['flight.destination = :destination']).toEqual({
      destination: 'MIA',
    });
    expect(qb.conditions['DATE(flight.departureAt) = :date']).toEqual({
      date: '2026-10-01',
    });
    expect(result).toEqual([]);
  });

  it('skips filters that are not present in the query', async () => {
    const qb = makeQueryBuilder([]);
    const service = serviceWith(qb);

    await service.search({ origin: 'BOG' });

    expect(qb.andWhere).toHaveBeenCalledTimes(1);
  });
});