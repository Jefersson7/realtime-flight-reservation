import { FlightDto, FlightSearchQuery } from '@shared/dto';
import { FlightStatus } from '@shared/enums';

const API_URL = import.meta.env.VITE_API_URL;

export async function searchFlights(query: FlightSearchQuery): Promise<FlightDto[]> {
  const params = new URLSearchParams();
  if (query.origin) params.set('origin', query.origin);
  if (query.destination) params.set('destination', query.destination);
  if (query.date) params.set('date', query.date);

  const response = await fetch(`${API_URL}/flights?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to search flights');
  return response.json();
}

// Used by the demo "change status" control and manual QA curls, not by any
// real user-facing flow — see FlightsController.updateStatus.
export async function updateFlightStatus(
  id: string,
  status: FlightStatus,
): Promise<FlightDto> {
  const response = await fetch(`${API_URL}/flights/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update flight status');
  return response.json();
}
