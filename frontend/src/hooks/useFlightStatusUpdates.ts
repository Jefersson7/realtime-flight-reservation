import { useEffect } from 'react';
import { FLIGHT_EVENTS, FlightStatusChangedPayload } from '@shared/events';
import { socket } from '../lib/socket';

export function useFlightStatusUpdates(
  onUpdate: (payload: FlightStatusChangedPayload) => void,
) {
  useEffect(() => {
    socket.on(FLIGHT_EVENTS.STATUS_CHANGED, onUpdate);
    return () => {
      socket.off(FLIGHT_EVENTS.STATUS_CHANGED, onUpdate);
    };
  }, [onUpdate]);
}
