import { BookingDto, FlightDto } from '@shared/dto';
import './ConfirmationPage.css';

interface ConfirmationPageProps {
  flight: FlightDto;
  booking: BookingDto;
  onDone: () => void;
}

export function ConfirmationPage({ flight, booking, onDone }: ConfirmationPageProps) {
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="page-eyebrow">
            <span className="page-live-dot" aria-hidden="true" />
            Reserva confirmada
          </span>
          <h1 className="page-title">¡Tu boleto está listo!</h1>
          <p className="page-subtitle">
            {flight.origin} → {flight.destination} · {flight.airline} {flight.flightNumber}
          </p>
        </div>
      </header>

      <main className="page-content">
        <div className="ticket-card">
          <div className="ticket-pnr-label">Código de reserva (PNR)</div>
          <div className="ticket-pnr">{booking.pnr}</div>

          <div className="ticket-details">
            <div>
              <div className="seat-summary-label">Pasajero</div>
              <div className="seat-summary-value">{booking.passengerName}</div>
            </div>
            <div>
              <div className="seat-summary-label">Asiento</div>
              <div className="seat-summary-value">{booking.seatNumber}</div>
            </div>
            <div>
              <div className="seat-summary-label">Total pagado</div>
              <div className="seat-summary-value">${booking.amount.toFixed(2)}</div>
            </div>
          </div>

          <button type="button" className="search-submit ticket-done" onClick={onDone}>
            Volver al inicio
          </button>
        </div>
      </main>
    </div>
  );
}
