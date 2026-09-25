import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './domain/booking.entity';
import { Seat } from '../seats/domain/seat.entity';
import { Flight } from '../flights/domain/flight.entity';
import { BookingsController } from './bookings.controller';
import { ConfirmBookingUseCase } from './application/confirm-booking.use-case';
import { TypeOrmBookingRepository } from './infrastructure/typeorm-booking.repository';
import { BOOKING_REPOSITORY } from './ports/booking-repository.port';
import { SeatsModule } from '../seats/seats.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Seat, Flight]),
    // Reuses SEAT_LOCK/SEAT_REPOSITORY (exported by SeatsModule) and
    // REALTIME_NOTIFIER (exported by RealtimeModule) instead of introducing
    // new ports for boundaries that already exist, per STATE.md's plan.
    SeatsModule,
    RealtimeModule,
  ],
  controllers: [BookingsController],
  providers: [
    ConfirmBookingUseCase,
    { provide: BOOKING_REPOSITORY, useClass: TypeOrmBookingRepository },
  ],
})
export class BookingsModule {}
