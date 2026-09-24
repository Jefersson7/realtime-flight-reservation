import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flight } from './domain/flight.entity';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { UpdateFlightStatusUseCase } from './application/update-flight-status.use-case';
import { FlightSeeder } from './infrastructure/flight.seeder';
import { TypeOrmFlightRepository } from './infrastructure/typeorm-flight.repository';
import { FLIGHT_REPOSITORY } from './ports/flight-repository.port';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([Flight]), RealtimeModule],
  controllers: [FlightsController],
  providers: [
    FlightsService,
    UpdateFlightStatusUseCase,
    FlightSeeder,
    { provide: FLIGHT_REPOSITORY, useClass: TypeOrmFlightRepository },
  ],
})
export class FlightsModule {}
