import { useEffect, useMemo, useState } from 'react';
import { FlightDto, SeatDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import { socket } from '../lib/socket';
import { useSeatMap } from '../hooks/useSeatMap';
import { useSocketStatus } from '../hooks/useSocketStatus';
import { SeatMap } from '../components/SeatMap';
import './SeatSelectionPage.css';

interface SeatSelectionPageProps {
  flight: FlightDto;
  onBack: () => void;
}

function useCountdown(expiresAt: string | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setLabel(null);
      return;
    }

    const target = expiresAt;

    function tick() {
      const remainingMs = new Date(target).getTime() - Date.now();
      if (remainingMs <= 0) {
        setLabel('00:00');
        return;
      }
      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setLabel(`${minutes}:${seconds}`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return label;
}

export function SeatSelectionPage({ flight, onBack }: SeatSelectionPageProps) {
  const { seats, loading, error, blockSeat, releaseSeat } = useSeatMap(flight.id);
  const socketStatus = useSocketStatus();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const myClientId = socketStatus === 'connected' ? socket.id ?? null : null;

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
        await releaseSeat(seat.id);
        return;
      }

      if (mySeat && mySeat.id !== seat.id) {
        await releaseSeat(mySeat.id);
      }

      const ack = await blockSeat(seat.id);
      if (!ack.ok) {
        setActionError(ack.message);
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
                    title="La confirmación de la reserva llega en la siguiente historia"
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
