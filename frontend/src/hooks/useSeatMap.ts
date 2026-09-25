import { useCallback, useEffect, useRef, useState } from 'react';
import { SeatDto } from '@shared/dto';
import { SeatStatus } from '@shared/enums';
import {
  SEAT_EVENTS,
  SeatBlockAck,
  SeatBlockedPayload,
  SeatOccupiedPayload,
  SeatReleaseAck,
  SeatReleasedPayload,
} from '@shared/events';
import { socket } from '../lib/socket';
import { getClientId } from '../lib/clientIdentity';
import { useSocketStatus } from './useSocketStatus';
import { getSeatMap } from '../api/seats.api';

export function useSeatMap(flightId: string) {
  const [seats, setSeats] = useState<SeatDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketStatus = useSocketStatus();

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

  // Permanent: unlike BLOCKED, an OCCUPIED seat never gets a release timer —
  // the booking confirmation is final.
  const applyOccupied = useCallback((payload: SeatOccupiedPayload) => {
    setSeats((prev) =>
      prev.map((seat) =>
        seat.id === payload.seatId
          ? { ...seat, status: SeatStatus.OCCUPIED, blockedBy: undefined, blockExpiresAt: undefined }
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
    socket.on(SEAT_EVENTS.OCCUPIED, applyOccupied);

    return () => {
      cancelled = true;
      socket.emit(SEAT_EVENTS.LEAVE_FLIGHT, { flightId });
      socket.off(SEAT_EVENTS.BLOCKED, applyBlock);
      socket.off(SEAT_EVENTS.RELEASED, applyRelease);
      socket.off(SEAT_EVENTS.OCCUPIED, applyOccupied);
    };
  }, [flightId, applyBlock, applyRelease, applyOccupied]);

  // After a socket reconnect the client may have missed BLOCKED/RELEASED
  // events while down, and the server-side reservation (owned by our stable
  // clientId) keeps living until its TTL. Re-join the flight room (a new
  // socket has no room membership yet) and re-fetch the seat map so the
  // remaining countdown and "blocked by me" state come back.
  const previousStatus = useRef(socketStatus);
  const hasMounted = useRef(false);
  useEffect(() => {
    const wasConnected = previousStatus.current === 'connected';
    previousStatus.current = socketStatus;

    if (!hasMounted.current) {
      hasMounted.current = true;
      return; // the mount effect above already joins + fetches
    }

    if (socketStatus === 'connected' && !wasConnected && socket.id) {
      socket.emit(SEAT_EVENTS.JOIN_FLIGHT, { flightId });
      getSeatMap(flightId)
        .then((data) => setSeats(data))
        .catch(() => setError('No se pudo cargar el mapa de asientos. Intenta de nuevo.'));
    }
  }, [socketStatus, flightId]);

  // Local safety net mirroring the server's auto-release: the moment a
  // reservation's countdown hits zero (or it is already past), the seat
  // frees itself in this client even if the `SEAT_RELEASED` broadcast was
  // missed (e.g. the backend restarted and lost its in-process timer).
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    seats.forEach((seat) => {
      if (seat.status !== SeatStatus.BLOCKED || !seat.blockExpiresAt) return;
      const remaining = new Date(seat.blockExpiresAt).getTime() - now;
      if (remaining <= 0) {
        applyRelease({ flightId, seatId: seat.id });
        return;
      }
      timers.push(setTimeout(() => applyRelease({ flightId, seatId: seat.id }), remaining));
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [seats, flightId, applyRelease]);

  const blockSeat = useCallback(
    (seatId: string) =>
      new Promise<SeatBlockAck>((resolve) => {
        socket.emit(
          SEAT_EVENTS.BLOCK,
          { flightId, seatId, clientId: getClientId() },
          (ack: SeatBlockAck) => {
            if (ack.ok) {
              applyBlock({ flightId, seatId, blockedBy: ack.blockedBy, expiresAt: ack.expiresAt });
            }
            resolve(ack);
          },
        );
      }),
    [flightId, applyBlock],
  );

  const releaseSeat = useCallback(
    (seatId: string) =>
      new Promise<SeatReleaseAck>((resolve) => {
        socket.emit(
          SEAT_EVENTS.RELEASE,
          { flightId, seatId, clientId: getClientId() },
          (ack: SeatReleaseAck) => {
            if (ack.ok) applyRelease({ flightId, seatId });
            resolve(ack);
          },
        );
      }),
    [flightId, applyRelease],
  );

  return { seats, loading, error, blockSeat, releaseSeat };
}