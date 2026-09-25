import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from './domain/seat.entity';
import { Flight } from '../flights/domain/flight.entity';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';
import { BlockSeatUseCase } from './application/block-seat.use-case';
import { ReleaseSeatUseCase } from './application/release-seat.use-case';
import { SeatSeeder } from './infrastructure/seat.seeder';
import { TypeOrmSeatRepository } from './infrastructure/typeorm-seat.repository';
import { RedisSeatLockAdapter } from './infrastructure/redis-seat-lock.adapter';
import { SEAT_REPOSITORY } from './ports/seat-repository.port';
import { SEAT_LOCK } from './ports/seat-lock.port';
import { RedisModule } from '../redis/redis.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Seat, Flight]),
    RedisModule,
    // Circular: RealtimeGateway invokes BlockSeatUseCase/ReleaseSeatUseCase
    // directly for the inbound `seat:block`/`seat:release` events (ADR-003
    // exception), while these use cases notify back through
    // RealtimeModule's REALTIME_NOTIFIER. forwardRef breaks the cycle.
    forwardRef(() => RealtimeModule),
  ],
  controllers: [SeatsController],
  providers: [
    SeatsService,
    BlockSeatUseCase,
    ReleaseSeatUseCase,
    SeatSeeder,
    { provide: SEAT_REPOSITORY, useClass: TypeOrmSeatRepository },
    { provide: SEAT_LOCK, useClass: RedisSeatLockAdapter },
  ],
  exports: [BlockSeatUseCase, ReleaseSeatUseCase, SEAT_REPOSITORY, SEAT_LOCK],
})
export class SeatsModule {}
