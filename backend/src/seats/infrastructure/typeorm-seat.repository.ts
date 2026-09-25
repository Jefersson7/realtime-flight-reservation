import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seat } from '../domain/seat.entity';
import { SeatRepositoryPort } from '../ports/seat-repository.port';

@Injectable()
export class TypeOrmSeatRepository implements SeatRepositoryPort {
  constructor(
    @InjectRepository(Seat)
    private readonly repository: Repository<Seat>,
  ) {}

  findByFlightId(flightId: string): Promise<Seat[]> {
    return this.repository.find({
      where: { flightId },
      order: { row: 'ASC', column: 'ASC' },
    });
  }

  findById(id: string): Promise<Seat | null> {
    return this.repository.findOne({ where: { id } });
  }
}
