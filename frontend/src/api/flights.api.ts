import { FlightDto, FlightSearchQuery } from '@shared/dto';
import { FlightStatus } from '@shared/enums';

const API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_TIMEOUT_MS = 10_000;

// Typed error for any API call: carries the HTTP status (null when the
// failure is network/timeout and there is no server response) and the
// endpoint that failed, so callers can tailor the message to the user.
export class ApiError extends Error {
  constructor(
    readonly status: number | null,
    message: string,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const body = await response.json();
        const candidate = (body as { message?: unknown })?.message;
        if (typeof candidate === 'string') message = candidate;
      } catch {
        // Non-JSON error body; keep the generic message.
      }
      throw new ApiError(response.status, message, path);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (isAbortError(error)) {
      throw new ApiError(
        null,
        `La petición tardó demasiado (${timeoutMs} ms) y fue cancelada`,
        path,
      );
    }
    throw new ApiError(null, 'No se pudo conectar con el servidor', path);
  } finally {
    clearTimeout(timeout);
  }
}

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