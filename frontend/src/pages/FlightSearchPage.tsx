import { useCallback, useEffect, useRef, useState } from 'react';
import { FlightDto, FlightSearchQuery } from '@shared/dto';
import { FlightStatus } from '@shared/enums';
import { ApiError, searchFlights, updateFlightStatus } from '../api/flights.api';
import { useFlightStatusUpdates } from '../hooks/useFlightStatusUpdates';
import { useSocketStatus } from '../hooks/useSocketStatus';
import { FlightSearchForm } from '../components/FlightSearchForm';
import { FlightList } from '../components/FlightList';
import './FlightSearchPage.css';

const STATUS_CYCLE: FlightStatus[] = [
  FlightStatus.SCHEDULED,
  FlightStatus.DELAYED,
  FlightStatus.CANCELLED,
  FlightStatus.SOLD_OUT,
];

function nextStatus(current: FlightStatus): FlightStatus {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
}

function searchErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    }
    if (error.status >= 500) {
      return 'Hubo un problema en el servidor. Intenta de nuevo en unos segundos.';
    }
    return error.message;
  }
  return 'No se pudo buscar vuelos. Intenta de nuevo en unos segundos.';
}

export function FlightSearchPage() {
  const [flights, setFlights] = useState<FlightDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const lastQueryRef = useRef<FlightSearchQuery | null>(null);
  const handleSearchRef = useRef<(query: FlightSearchQuery) => Promise<void>>(async () => {});
  const status = useSocketStatus();
  const previousStatus = useRef(status);

  async function handleSearch(query: FlightSearchQuery) {
    try {
      setLoading(true);
      setError(null);
      lastQueryRef.current = query;
      setFlights(await searchFlights(query));
      setHasSearched(true);
    } catch (searchError) {
      console.error('[FlightSearchPage] search failed', searchError);
      setError(searchErrorMessage(searchError));
    } finally {
      setLoading(false);
    }
  }

  handleSearchRef.current = handleSearch;

  // After a socket reconnect the client may have missed events while down,
  // so re-run the last search to resync with the server.
  useEffect(() => {
    const wasConnected = previousStatus.current === 'connected';
    previousStatus.current = status;

    if (
      status === 'connected' &&
      !wasConnected &&
      hasSearched &&
      lastQueryRef.current
    ) {
      handleSearchRef.current(lastQueryRef.current);
    }
  }, [status, hasSearched]);

  const handleStatusChanged = useCallback(
    (payload: { flightId: string; status: FlightDto['status'] }) => {
      setFlights((prev) =>
        prev.map((flight) =>
          flight.id === payload.flightId ? { ...flight, status: payload.status } : flight,
        ),
      );
    },
    [],
  );

  useFlightStatusUpdates(handleStatusChanged);

  async function handleDemoStatusChange(flight: FlightDto) {
    try {
      setError(null);
      await updateFlightStatus(flight.id, nextStatus(flight.status));
    } catch (demoError) {
      console.error('[FlightSearchPage] demo status change failed', demoError);
      setError(
        demoError instanceof ApiError && demoError.status !== null
          ? demoError.message
          : 'No se pudo actualizar el estado del vuelo. Intenta de nuevo.',
      );
    }
  }

  const realtimeDown = hasSearched && status !== 'connected';

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="page-eyebrow">
            <span className="page-live-dot" aria-hidden="true" />
            Estado en tiempo real
          </span>
          <h1 className="page-title">Encuentra tu próximo vuelo</h1>
          <p className="page-subtitle">
            Busca por origen, destino y fecha. Los cambios de estado del vuelo se reflejan al instante.
          </p>
        </div>
      </header>

      <main className="page-content">
        {realtimeDown && (
          <div className="page-rt-banner" role="status">
            Conexión en tiempo real perdida. Reconectando… Los cambios se sincronizarán al volver.
          </div>
        )}

        <FlightSearchForm onSearch={handleSearch} />

        {error && <div className="page-error">{error}</div>}

        {loading && <div className="page-loading">Buscando vuelos…</div>}

        {!loading && !hasSearched && (
          <div className="page-placeholder">
            <span className="page-placeholder-icon" aria-hidden="true">
              🛫
            </span>
            Usa el buscador para ver los vuelos disponibles.
          </div>
        )}

        {!loading && hasSearched && (
          <FlightList flights={flights} onDemoStatusChange={handleDemoStatusChange} />
        )}
      </main>
    </div>
  );
}