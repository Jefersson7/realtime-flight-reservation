import { useMemo } from 'react';
import { FlightDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import { useSeatMap } from '../hooks/useSeatMap';
import { useSocketStatus } from '../hooks/useSocketStatus';
import './FlightDashboardPage.css';

interface FlightDashboardPageProps {
  flight: FlightDto;
  onBack: () => void;
}

interface OccupancyStats {
  total: number;
  available: number;
  blocked: number;
  occupied: number;
}

function computeStats(seats: { status: SeatStatus }[]): OccupancyStats {
  const stats = { total: seats.length, available: 0, blocked: 0, occupied: 0 };
  for (const seat of seats) {
    if (seat.status === SeatStatus.AVAILABLE) stats.available += 1;
    else if (seat.status === SeatStatus.BLOCKED) stats.blocked += 1;
    else if (seat.status === SeatStatus.OCCUPIED) stats.occupied += 1;
  }
  return stats;
}

function pct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 1000) / 10;
}

// Reuses `useSeatMap` (mismo hook de la selección de asientos) en vez de un
// endpoint/eventos nuevos: ya hace join a la room `flight:{id}` y reacciona
// a SEAT_BLOCKED/SEAT_RELEASED/SEAT_OCCUPIED al instante, que es exactamente
// la regla de tiempo real que pide esta historia. El dashboard solo agrega
// una capa de agregación (conteos) sobre esos mismos datos en vivo.
export function FlightDashboardPage({ flight, onBack }: FlightDashboardPageProps) {
  const { seats, loading, error } = useSeatMap(flight.id);
  const socketStatus = useSocketStatus();
  const realtimeDown = socketStatus !== 'connected';

  const stats = useMemo(() => computeStats(seats), [seats]);
  const occupancyPct = pct(stats.occupied, stats.total);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-inner">
          <button type="button" className="seat-back-button" onClick={onBack}>
            ← Volver a la búsqueda
          </button>
          <h1 className="page-title">
            {flight.origin} → {flight.destination}
          </h1>
          <p className="page-subtitle">
            {flight.airline} · {flight.flightNumber} · Ocupación del vuelo en vivo
          </p>
        </div>
      </header>

      <main className="page-content">
        {realtimeDown && (
          <div className="page-rt-banner" role="status">
            Conexión en tiempo real perdida. Reconectando… Las métricas pueden no reflejar los
            últimos cambios.
          </div>
        )}

        {error && <div className="page-error">{error}</div>}

        {loading && <div className="page-loading">Cargando métricas del vuelo…</div>}

        {!loading && !error && (
          <>
            <div className="dashboard-stats">
              <div className="stat-tile">
                <div className="stat-tile-value">{stats.available}</div>
                <div className="stat-tile-label">Asientos disponibles</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-value">{stats.blocked}</div>
                <div className="stat-tile-label">Bloqueados temporalmente</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-value">{stats.occupied}</div>
                <div className="stat-tile-label">Ocupados (reservados)</div>
              </div>
            </div>

            <div className="dashboard-occupancy">
              <div className="dashboard-occupancy-header">
                <span>Ocupación del vuelo</span>
                <span className="dashboard-occupancy-pct">{occupancyPct}%</span>
              </div>

              <div
                className="dashboard-occupancy-bar"
                role="img"
                aria-label={`${stats.available} asientos disponibles, ${stats.blocked} bloqueados, ${stats.occupied} ocupados de ${stats.total} en total`}
              >
                {stats.available > 0 && (
                  <span
                    className="dashboard-segment dashboard-segment--available"
                    style={{ width: `${pct(stats.available, stats.total)}%` }}
                  />
                )}
                {stats.blocked > 0 && (
                  <span
                    className="dashboard-segment dashboard-segment--blocked"
                    style={{ width: `${pct(stats.blocked, stats.total)}%` }}
                  />
                )}
                {stats.occupied > 0 && (
                  <span
                    className="dashboard-segment dashboard-segment--occupied"
                    style={{ width: `${pct(stats.occupied, stats.total)}%` }}
                  />
                )}
              </div>

              <ul className="dashboard-legend">
                <li className="dashboard-legend-item">
                  <span className="dashboard-legend-dot dashboard-legend-dot--available" aria-hidden="true" />
                  Disponibles: <strong>{stats.available}</strong>
                </li>
                <li className="dashboard-legend-item">
                  <span className="dashboard-legend-dot dashboard-legend-dot--blocked" aria-hidden="true" />
                  Bloqueados: <strong>{stats.blocked}</strong>
                </li>
                <li className="dashboard-legend-item">
                  <span className="dashboard-legend-dot dashboard-legend-dot--occupied" aria-hidden="true" />
                  Ocupados: <strong>{stats.occupied}</strong>
                </li>
                <li className="dashboard-legend-item dashboard-legend-item--total">
                  Total: <strong>{stats.total}</strong> asientos
                </li>
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
