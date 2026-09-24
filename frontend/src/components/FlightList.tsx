import { MouseEvent, useState } from 'react';
import { FlightDto } from '@shared/dto';
import { FlightStatus } from '@shared/enums';
import { updateFlightStatus } from '../api/flights.api';
import './FlightList.css';

const STATUS_LABELS: Record<FlightStatus, string> = {
  [FlightStatus.SCHEDULED]: 'A tiempo',
  [FlightStatus.DELAYED]: 'Retrasado',
  [FlightStatus.CANCELLED]: 'Cancelado',
  [FlightStatus.SOLD_OUT]: 'Agotado',
};

const STATUS_ICONS: Record<FlightStatus, string> = {
  [FlightStatus.SCHEDULED]: '●',
  [FlightStatus.DELAYED]: '⏱',
  [FlightStatus.CANCELLED]: '✕',
  [FlightStatus.SOLD_OUT]: '⊘',
};

const STATUS_CYCLE: FlightStatus[] = [
  FlightStatus.SCHEDULED,
  FlightStatus.DELAYED,
  FlightStatus.CANCELLED,
  FlightStatus.SOLD_OUT,
];

function airlineInitials(airline: string): string {
  return airline
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface FlightListProps {
  flights: FlightDto[];
}

export function FlightList({ flights }: FlightListProps) {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  if (flights.length === 0) {
    return (
      <div className="flight-empty-state">
        No encontramos vuelos para los filtros seleccionados. Prueba con otra fecha o ruta.
      </div>
    );
  }

  function toggleSelected(flightId: string) {
    setSelectedFlightId((current) => (current === flightId ? null : flightId));
  }

  async function handleDemoStatusChange(event: MouseEvent, flight: FlightDto) {
    event.stopPropagation();
    const nextStatus =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(flight.status) + 1) % STATUS_CYCLE.length];
    await updateFlightStatus(flight.id, nextStatus);
  }

  return (
    <div>
      <div className="flight-list-header">
        <h2>
          {flights.length} vuelo{flights.length === 1 ? '' : 's'} encontrado
          {flights.length === 1 ? '' : 's'}
        </h2>
      </div>

      <div className="flight-list">
        {flights.map((flight) => {
          const departure = new Date(flight.departureAt);
          const isSelected = flight.id === selectedFlightId;
          return (
            <div
              className={`flight-card${isSelected ? ' flight-card--selected' : ''}`}
              key={flight.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleSelected(flight.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggleSelected(flight.id);
              }}
            >
              <div className="flight-card-main">
                <div className="flight-airline">
                  <div className="flight-airline-badge">{airlineInitials(flight.airline)}</div>
                  <div>
                    <div className="flight-airline-name">{flight.airline}</div>
                    <div className="flight-number">{flight.flightNumber}</div>
                  </div>
                </div>

                <div className="flight-route">
                  <div className="flight-route-point">
                    <span className="flight-route-code">{flight.origin}</span>
                    <span className="flight-route-label">Origen</span>
                  </div>
                  <div className="flight-route-line">✈</div>
                  <div className="flight-route-point">
                    <span className="flight-route-code">{flight.destination}</span>
                    <span className="flight-route-label">Destino</span>
                  </div>
                </div>

                <div className="flight-departure">
                  <span className="flight-departure-time">
                    {departure.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="flight-departure-date">
                    {departure.toLocaleDateString('es-CO', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>

                <div className="flight-status-cell">
                  <span className={`status-badge status-${flight.status}`}>
                    <span aria-hidden="true">{STATUS_ICONS[flight.status]}</span>
                    {STATUS_LABELS[flight.status]}
                  </span>
                </div>

                <div className="flight-price-cell">
                  <div className="flight-price">${flight.price.toFixed(0)}</div>
                  <div className="flight-price-label">por pasajero</div>
                </div>
              </div>

              {isSelected && (
                <div className="flight-card-footer">
                  <span className="flight-card-footer-label">Vuelo seleccionado</span>
                  <button
                    className="flight-demo-button"
                    onClick={(e) => handleDemoStatusChange(e, flight)}
                    title="Control de demo/QA: simula un cambio de estado en tiempo real"
                  >
                    cambiar estado ↻
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
