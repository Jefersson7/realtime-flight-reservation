import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlightStatus } from '@shared/enums';
import { Flight } from '../domain/flight.entity';

// Seeds sample flights on boot outside production, guarded by a count
// check so `start:dev` restarts don't duplicate rows. There is no
// migrations setup in this project (synchronize: true outside production),
// so this is simpler than wiring a seed migration.
@Injectable()
export class FlightSeeder implements OnModuleInit {
  private readonly logger = new Logger(FlightSeeder.name);

  constructor(
    @InjectRepository(Flight)
    private readonly flightRepository: Repository<Flight>,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production') return;

    const count = await this.flightRepository.count();
    if (count > 0) return;

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const sample: Partial<Flight>[] = [
      {
        flightNumber: 'AR101',
        airline: 'Aerolineas Reales',
        origin: 'BOG',
        destination: 'MIA',
        departureAt: new Date(now + 1 * day),
        price: '350.00',
        status: FlightStatus.SCHEDULED,
      },
      {
        flightNumber: 'AR102',
        airline: 'Aerolineas Reales',
        origin: 'BOG',
        destination: 'MIA',
        departureAt: new Date(now + 2 * day),
        price: '380.00',
        status: FlightStatus.DELAYED,
      },
      {
        flightNumber: 'AR103',
        airline: 'Aerolineas Reales',
        origin: 'MIA',
        destination: 'BOG',
        departureAt: new Date(now + 1 * day),
        price: '340.00',
        status: FlightStatus.SCHEDULED,
      },
      {
        flightNumber: 'SK220',
        airline: 'SkyConnect',
        origin: 'BOG',
        destination: 'MDE',
        departureAt: new Date(now + 1 * day),
        price: '90.00',
        status: FlightStatus.SCHEDULED,
      },
      {
        flightNumber: 'SK221',
        airline: 'SkyConnect',
        origin: 'MDE',
        destination: 'BOG',
        departureAt: new Date(now + 3 * day),
        price: '95.00',
        status: FlightStatus.SOLD_OUT,
      },
      {
        flightNumber: 'LX330',
        airline: 'LatamX',
        origin: 'BOG',
        destination: 'SCL',
        departureAt: new Date(now + 4 * day),
        price: '410.00',
        status: FlightStatus.SCHEDULED,
      },
      {
        flightNumber: 'LX331',
        airline: 'LatamX',
        origin: 'SCL',
        destination: 'BOG',
        departureAt: new Date(now + 5 * day),
        price: '415.00',
        status: FlightStatus.CANCELLED,
      },
      {
        flightNumber: 'AR104',
        airline: 'Aerolineas Reales',
        origin: 'BOG',
        destination: 'MIA',
        departureAt: new Date(now + 6 * day),
        price: '360.00',
        status: FlightStatus.SCHEDULED,
      },
    ];

    await this.flightRepository.save(sample.map((f) => this.flightRepository.create(f)));
    this.logger.log(`Seeded ${sample.length} sample flights`);
  }
}
