import { useCallback, useEffect, useState } from 'react';
import { SeatDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import {
  SEAT_EVENTS,
  SeatBlockAck,
  SeatBlockedPayload,
  SeatReleaseAck,
  SeatReleasedPayload,
} from '@shared/events';
import { socket } from '../lib/socket';
import { getSeatMap } from '../api/seats.api';

export function useSeatMap(flightId: string) {
  const [seats, setSeats] = useState<SeatDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyBlock = useCallback((payload: SeatBlockedPayload) => {
    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === payload.seatId
          ? {
              ...seat,
              status: SeatStatus.BLOCKED,
              blockedBy: payload.blockedBy,
              blockExpiresAt: payload.expiresAt,
            }
          : seat,
      ),
    );
  }, []);

  const applyRelease = useCallback((payload: SeatReleasedPayload) => {
    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === payload.seatId
          ? { ...seat, status: SeatStatus.AVAILABLE, blockedBy: undefined, blockExpiresAt: undefined }
          : seat,
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getSeatMap(flightId)
      .then((data) => {
        if (!cancelled) setSeats(data);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el mapa de asientos. Intenta de nuevo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    socket.emit(SEAT_EVENTS.JOIN_FLIGHT, { flightId });
    socket.on(SEAT_EVENTS.BLOCKED, applyBlock);
    socket.on(SEAT_EVENTS.RELEASED, applyRelease);

    return () => {
      cancelled = true;
      socket.emit(SEAT_EVENTS.LEAVE_FLIGHT, { flightId });
      socket.off(SEAT_EVENTS.BLOCKED, applyBlock);
      socket.off(SEAT_EVENTS.RELEASED, applyRelease);
    };
  }, [flightId, applyBlock, applyRelease]);

  const blockSeat = useCallback(
    (seatId: string) =>
      new Promise<SeatBlockAck>((resolve) => {
        socket.emit(SEAT_EVENTS.BLOCK, { flightId, seatId }, (ack: SeatBlockAck) => {
          if (ack.ok) {
            applyBlock({ flightId, seatId, blockedBy: ack.blockedBy, expiresAt: ack.expiresAt });
          }
          resolve(ack);
        });
      }),
    [flightId, applyBlock],
  );

  const releaseSeat = useCallback(
    (seatId: string) =>
      new Promise<SeatReleaseAck>((resolve) => {
        socket.emit(SEAT_EVENTS.RELEASE, { flightId, seatId }, (ack: SeatReleaseAck) => {
          if (ack.ok) applyRelease({ flightId, seatId });
          resolve(ack);
        });
      }),
    [flightId, applyRelease],
  );

  return { seats, loading, error, blockSeat, releaseSeat };
}
