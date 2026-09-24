import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlightDto } from '@shared/dto';
import { Flight } from './domain/flight.entity';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { toFlightDto } from './dto/flight.mapper';

// Read-only, so it talks to the TypeORM repository directly instead of
// going through a port — per ADR-003, ports are reserved for volatile
// boundaries (persistence writes, Redis lock, realtime notification).
@Injectable()
export class FlightsService {
  constructor(
    @InjectRepository(Flight)
    private readonly flightRepository: Repository<Flight>,
  ) {}

  async search(query: SearchFlightsDto): Promise<FlightDto[]> {
    const qb = this.flightRepository.createQueryBuilder('flight');

    if (query.origin) {
      qb.andWhere('flight.origin = :origin', { origin: query.origin });
    }
    if (query.destination) {
      qb.andWhere('flight.destination = :destination', {
        destination: query.destination,
      });
    }
    if (query.date) {
      qb.andWhere('DATE(flight.departureAt) = :date', { date: query.date });
    }

    const flights = await qb.orderBy('flight.departureAt', 'ASC').getMany();
    return flights.map(toFlightDto);
  }
}
