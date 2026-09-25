import { useMemo, useState } from 'react';
import { FlightDto, SeatDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import { getClientId } from '../lib/clientIdentity';
import { useSeatMap } from '../hooks/useSeatMap';
import { useSocketStatus } from '../hooks/useSocketStatus';
import { useCountdown } from '../hooks/useCountdown';
import { SeatMap } from '../components/SeatMap';
import './SeatSelectionPage.css';

interface SeatSelectionPageProps {
  flight: FlightDto;
  onBack: () => void;
  onContinueToPayment: (seat: SeatDto) => void;
}

export function SeatSelectionPage({ flight, onBack, onContinueToPayment }: SeatSelectionPageProps) {
  const { seats, loading, error, blockSeat, releaseSeat } = useSeatMap(flight.id);
  const socketStatus = useSocketStatus();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Stable per-tab token that owns the lock (survives reconnects) — never
  // the socket id, which changes on every reconnection.
  const myClientId = getClientId();

  const mySeat = useMemo(
    () => seats.find((seat) => seat.status === SeatStatus.BLOCKED && seat.blockedBy === myClientId),
    [seats, myClientId],
  );

  const countdown = useCountdown(mySeat?.blockExpiresAt);

  async function handleSeatClick(seat: SeatDto) {
    if (pending) return;
    setActionError(null);
    setPending(true);

    try {
      if (seat.status === SeatStatus.BLOCKED && seat.blockedBy === myClientId) {
        const ack = await releaseSeat(seat.id);
        if (!ack.ok) setActionError(ack.message ?? 'No se pudo liberar el asiento.');
        return;
      }

      // Block the new seat FIRST and only release the current one after the
      // new block succeeded: if blocking fails (e.g. another user raced in),
      // we keep our existing reservation instead of losing it.
      const ack = await blockSeat(seat.id);
      if (!ack.ok) {
        setActionError(ack.message);
        return;
      }

      if (mySeat && mySeat.id !== seat.id) {
        const releaseAck = await releaseSeat(mySeat.id);
        if (!releaseAck.ok) {
          setActionError(
            releaseAck.message ?? 'No se pudo liberar el asiento anterior; se liberará automáticamente.',
          );
        }
      }
    } finally {
      setPending(false);
    }
  }

  const realtimeDown = socketStatus !== 'connected';

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-inner">
          <button type="button" className="seat-back-button" onClick={onBack}>
            ← Volver a la búsqueda
          </button>
          <span className="page-eyebrow">
            <span className="page-live-dot" aria-hidden="true" />
            Estado en tiempo real
          </span>
          <h1 className="page-title">
            {flight.origin} → {flight.destination}
          </h1>
          <p className="page-subtitle">
            {flight.airline} · {flight.flightNumber} · Selecciona un asiento para reservarlo
            temporalmente mientras completas tu pago.
          </p>
        </div>
      </header>

      <main className="page-content">
        {realtimeDown && (
          <div className="page-rt-banner" role="status">
            Conexión en tiempo real perdida. Reconectando… No podrás bloquear asientos hasta
            reconectar.
          </div>
        )}

        {error && <div className="page-error">{error}</div>}
        {actionError && <div className="page-error">{actionError}</div>}

        {loading && <div className="page-loading">Cargando mapa de asientos…</div>}

        {!loading && (
          <>
            <SeatMap
              seats={seats}
              myClientId={myClientId}
              disabled={pending || realtimeDown}
              onSeatClick={handleSeatClick}
            />

            <div className="seat-summary">
              {mySeat ? (
                <>
                  <div>
                    <div className="seat-summary-label">Asiento seleccionado</div>
                    <div className="seat-summary-value">{mySeat.seatNumber}</div>
                  </div>
                  <div>
                    <div className="seat-summary-label">Se libera en</div>
                    <div className="seat-summary-countdown">{countdown ?? '—'}</div>
                  </div>
                  <button
                    type="button"
                    className="seat-summary-cta"
                    disabled={pending}
                    onClick={() => onContinueToPayment(mySeat)}
                  >
                    Continuar con el pago
                  </button>
                </>
              ) : (
                <span className="seat-summary-empty">
                  Elige un asiento disponible en el mapa para reservarlo por 10 minutos.
                </span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
