import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CabinClass, SeatStatus } from '@shared/enums';
import { Flight } from '../../flights/domain/flight.entity';
import { Seat } from '../domain/seat.entity';

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];
const BUSINESS_ROWS = 2;
const ECONOMY_ROWS = 10;

// Runs on `onApplicationBootstrap` (after every module's `onModuleInit`),
// not `onModuleInit`, so it never races FlightSeeder for module init order:
// it only needs flights to already exist in the DB.
@Injectable()
export class SeatSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeatSeeder.name);

  constructor(
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(Flight)
    private readonly flightRepository: Repository<Flight>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'production') return;

    const flights = await this.flightRepository.find();
    for (const flight of flights) {
      const existing = await this.seatRepository.count({ where: { flightId: flight.id } });
      if (existing > 0) continue;

      const seats = this.buildLayout(flight.id).map((seat) => this.seatRepository.create(seat));
      await this.seatRepository.save(seats);
    }

    this.logger.log(`Seat map seeding complete for ${flights.length} flight(s)`);
  }

  private buildLayout(flightId: string): Partial<Seat>[] {
    const totalRows = BUSINESS_ROWS + ECONOMY_ROWS;
    const seats: Partial<Seat>[] = [];

    for (let row = 1; row <= totalRows; row++) {
      const cabinClass = row <= BUSINESS_ROWS ? CabinClass.BUSINESS : CabinClass.ECONOMY;
      for (const column of COLUMNS) {
        const seatNumber = `${row}${column}`;
        // A handful of pre-occupied seats so the seat map demonstrates all
        // three visual states (available/blocked/occupied) without needing
        // the booking flow (story 3) to exist yet.
        const isOccupied = (row * 7 + COLUMNS.indexOf(column)) % 11 === 0;

        seats.push({
          flightId,
          row,
          column,
          seatNumber,
          cabinClass,
          status: isOccupied ? SeatStatus.OCCUPIED : SeatStatus.AVAILABLE,
        });
      }
    }

    return seats;
  }
}
