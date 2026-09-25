import {
  FlightStatusChangedPayload,
  SeatBlockedPayload,
  SeatReleasedPayload,
} from '@shared/events';

// Output port implemented by RealtimeGateway. Domain modules depend on this
// interface + token only — never on the concrete gateway class — so the
// unidirectional dependency rule toward `realtime` holds (see ADR-003).
export interface RealtimeNotifierPort {
  notifyFlightStatusChanged(payload: FlightStatusChangedPayload): void;
  notifySeatBlocked(payload: SeatBlockedPayload): void;
  notifySeatReleased(payload: SeatReleasedPayload): void;
}

export const REALTIME_NOTIFIER = Symbol('REALTIME_NOTIFIER');
