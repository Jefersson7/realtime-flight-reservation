import { BookingDto, ConfirmBookingRequest } from '@shared/dto';
import { apiFetch } from './http';

export function confirmBooking(payload: ConfirmBookingRequest): Promise<BookingDto> {
  return apiFetch<BookingDto>('/bookings/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
