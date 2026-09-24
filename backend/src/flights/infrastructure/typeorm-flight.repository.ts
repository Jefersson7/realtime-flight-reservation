import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flight } from '../domain/flight.entity';
import { FlightRepositoryPort } from '../ports/flight-repository.port';

@Injectable()
export class TypeOrmFlightRepository implements FlightRepositoryPort {
  constructor(
    @InjectRepository(Flight)
    private readonly repository: Repository<Flight>,
  ) {}

  findById(id: string): Promise<Flight | null> {
    return this.repository.findOne({ where: { id } });
  }

  save(flight: Flight): Promise<Flight> {
    return this.repository.save(flight);
  }
}
