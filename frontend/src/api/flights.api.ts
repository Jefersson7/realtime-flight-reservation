import { FlightDto, FlightSearchQuery } from '@shared/dto';
import { FlightStatus } from '@shared/enums';
import { apiFetch } from './http';

export { ApiError } from './http';

export function searchFlights(query: FlightSearchQuery): Promise<FlightDto[]> {
  const params = new URLSearchParams();
  if (query.origin) params.set('origin', query.origin);
  if (query.destination) params.set('destination', query.destination);
  if (query.date) params.set('date', query.date);

  return apiFetch<FlightDto[]>(`/flights?${params.toString()}`);
}

export function updateFlightStatus(
  id: string,
  status: FlightStatus,
): Promise<FlightDto> {
  return apiFetch<FlightDto>(`/flights/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}
