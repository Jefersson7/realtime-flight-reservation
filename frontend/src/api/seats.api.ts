import { SeatDto } from '@shared/dto';
import { apiFetch } from './http';

export function getSeatMap(flightId: string): Promise<SeatDto[]> {
  return apiFetch<SeatDto[]>(`/flights/${flightId}/seats`);
}
