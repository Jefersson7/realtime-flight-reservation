import { Body, Controller, Post } from '@nestjs/common';
import { ConfirmBookingUseCase } from './application/confirm-booking.use-case';
import { ConfirmBookingRequestDto } from './dto/confirm-booking-request.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly confirmBookingUseCase: ConfirmBookingUseCase) {}

  @Post('confirm')
  confirm(@Body() dto: ConfirmBookingRequestDto) {
    return this.confirmBookingUseCase.execute(dto);
  }
}
