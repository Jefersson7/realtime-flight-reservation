import { Controller, Get, Param } from '@nestjs/common';
import { SeatsService } from './seats.service';

@Controller('flights/:flightId/seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get()
  getSeatMap(@Param('flightId') flightId: string) {
    return this.seatsService.getSeatMap(flightId);
  }
}
