import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { FLIGHT_EVENTS, FlightStatusChangedPayload } from '@shared/events';
import { RealtimeNotifierPort } from './ports/realtime-notifier.port';

// Broadcasts globally (no rooms) because flight search has no per-flight
// room concept yet. `seats` will introduce `flight:{id}` rooms and inbound
// listeners (e.g. `seat:block`) here — the gateway already owns `server`
// so that extension needs no refactor.
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class RealtimeGateway implements RealtimeNotifierPort {
  @WebSocketServer()
  server: Server;

  notifyFlightStatusChanged(payload: FlightStatusChangedPayload): void {
    this.server.emit(FLIGHT_EVENTS.STATUS_CHANGED, payload);
  }
}
