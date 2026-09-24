import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { UpdateFlightStatusDto } from './dto/update-flight-status.dto';
import { UpdateFlightStatusUseCase } from './application/update-flight-status.use-case';

@Controller('flights')
export class FlightsController {
  constructor(
    private readonly flightsService: FlightsService,
    private readonly updateFlightStatusUseCase: UpdateFlightStatusUseCase,
  ) {}

  @Get()
  search(@Query() query: SearchFlightsDto) {
    return this.flightsService.search(query);
  }

  // Demo/QA endpoint: lets us change a flight's status manually to verify
  // the realtime update requirement, since there is no real airline feed
  // driving status changes in this system.
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFlightStatusDto) {
    return this.updateFlightStatusUseCase.execute(id, dto.status);
  }
}
