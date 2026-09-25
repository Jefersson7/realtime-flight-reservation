import { FormEvent, useState } from 'react';
import { BookingDto, FlightDto, SeatDto } from '@shared/dto';
import { getClientId } from '../lib/clientIdentity';
import { useCountdown } from '../hooks/useCountdown';
import { confirmBooking } from '../api/bookings.api';
import { ApiError } from '../api/http';
import './CheckoutPage.css';

interface CheckoutPageProps {
  flight: FlightDto;
  seat: SeatDto;
  onBack: () => void;
  onConfirmed: (booking: BookingDto) => void;
}

const CARD_NUMBER_PATTERN = /^\d{16}$/;
const EXPIRY_DATE_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;
const CVV_PATTERN = /^\d{3,4}$/;

export function CheckoutPage({ flight, seat, onBack, onConfirmed }: CheckoutPageProps) {
  const countdown = useCountdown(seat.blockExpiresAt);
  const expired = countdown === '00:00';

  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formValid =
    cardHolderName.trim().length > 0 &&
    CARD_NUMBER_PATTERN.test(cardNumber) &&
    EXPIRY_DATE_PATTERN.test(expiryDate) &&
    CVV_PATTERN.test(cvv);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formValid || pending || expired) return;

    setPending(true);
    setError(null);
    try {
      const booking = await confirmBooking({
        flightId: flight.id,
        seatId: seat.id,
        clientId: getClientId(),
        cardHolderName: cardHolderName.trim(),
        cardNumber,
        expiryDate,
        cvv,
      });
      onConfirmed(booking);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo confirmar la reserva. Intenta de nuevo.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-inner">
          <button type="button" className="seat-back-button" onClick={onBack}>
            ← Volver a la selección de asientos
          </button>
          <span className="page-eyebrow">
            <span className="page-live-dot" aria-hidden="true" />
            Estado en tiempo real
          </span>
          <h1 className="page-title">Confirma tu pago</h1>
          <p className="page-subtitle">
            {flight.origin} → {flight.destination} · {flight.airline} {flight.flightNumber}
          </p>
        </div>
      </header>

      <main className="page-content">
        <div className="checkout-summary">
          <div>
            <div className="seat-summary-label">Asiento seleccionado</div>
            <div className="seat-summary-value">{seat.seatNumber}</div>
          </div>
          <div>
            <div className="seat-summary-label">Se libera en</div>
            <div className="seat-summary-countdown">{countdown ?? '—'}</div>
          </div>
          <div>
            <div className="seat-summary-label">Total a pagar</div>
            <div className="seat-summary-value">${flight.price.toFixed(2)}</div>
          </div>
        </div>

        {error && <div className="page-error">{error}</div>}

        {expired ? (
          <div className="checkout-expired">
            <p>La reserva de tu asiento expiró antes de completar el pago.</p>
            <button type="button" className="search-submit" onClick={onBack}>
              Volver a seleccionar un asiento
            </button>
          </div>
        ) : (
          <form className="search-card checkout-form" onSubmit={handleSubmit}>
            <div className="search-fields">
              <div className="search-field checkout-field--wide">
                <label htmlFor="cardHolderName">Nombre en la tarjeta</label>
                <input
                  id="cardHolderName"
                  placeholder="Jane Doe"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                />
              </div>

              <div className="search-field checkout-field--wide">
                <label htmlFor="cardNumber">Número de tarjeta</label>
                <input
                  id="cardNumber"
                  placeholder="4111111111111111"
                  inputMode="numeric"
                  maxLength={16}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="search-field">
                <label htmlFor="expiryDate">Expiración (MM/YY)</label>
                <input
                  id="expiryDate"
                  placeholder="12/28"
                  maxLength={5}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              <div className="search-field">
                <label htmlFor="cvv">CVV</label>
                <input
                  id="cvv"
                  placeholder="123"
                  inputMode="numeric"
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <button type="submit" className="search-submit" disabled={!formValid || pending}>
                {pending ? 'Procesando…' : 'Pagar y confirmar reserva'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
