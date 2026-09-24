import { useCallback, useState } from 'react';
import { FlightDto, FlightSearchQuery } from '@shared/dto';
import { searchFlights } from '../api/flights.api';
import { useFlightStatusUpdates } from '../hooks/useFlightStatusUpdates';
import { FlightSearchForm } from '../components/FlightSearchForm';
import { FlightList } from '../components/FlightList';
import './FlightSearchPage.css';

export function FlightSearchPage() {
  const [flights, setFlights] = useState<FlightDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(query: FlightSearchQuery) {
    try {
      setLoading(true);
      setError(null);
      setFlights(await searchFlights(query));
      setHasSearched(true);
    } catch {
      setError('No se pudo buscar vuelos. Intenta de nuevo en unos segundos.');
    } finally {
      setLoading(false);
    }
  }

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

        {!loading && hasSearched && <FlightList flights={flights} />}
      </main>
    </div>
  );
}
