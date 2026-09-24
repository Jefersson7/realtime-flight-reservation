import { forwardRef, Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  FLIGHT_EVENTS,
  FlightStatusChangedPayload,
  JoinFlightPayload,
  SEAT_EVENTS,
  SeatBlockedPayload,
  SeatBlockRequest,
  SeatReleasedPayload,
  SeatReleaseRequest,
} from '@shared/events';
import { RealtimeNotifierPort } from './ports/realtime-notifier.port';
import { flightRoom } from './utils/flight-room';
import { BlockSeatUseCase } from '../seats/application/block-seat.use-case';
import { ReleaseSeatUseCase } from '../seats/application/release-seat.use-case';

interface LockedSeat {
  flightId: string;
  seatId: string;
}

// Broadcasts flight-status updates globally (no room) but scopes seat
// events to `flight:{id}` rooms, since only clients viewing that flight's
// seat map need them. Also owns the inbound `seat:block`/`seat:release`
// listeners: a documented exception to the unidirectional dependency rule
// toward `realtime` (see ADR-003) — the gateway acts as a WS "controller"
// for seats/application, same as any HTTP controller would.
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class RealtimeGateway implements RealtimeNotifierPort, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Tracks which seats each socket currently holds a lock on, so a
  // disconnect (tab closed, network drop) releases them automatically.
  private readonly locksByClient = new Map<string, Map<string, LockedSeat>>();

  constructor(
    @Inject(forwardRef(() => BlockSeatUseCase))
    private readonly blockSeatUseCase: BlockSeatUseCase,
    @Inject(forwardRef(() => ReleaseSeatUseCase))
    private readonly releaseSeatUseCase: ReleaseSeatUseCase,
  ) {}

  notifyFlightStatusChanged(payload: FlightStatusChangedPayload): void {
    this.server.emit(FLIGHT_EVENTS.STATUS_CHANGED, payload);
  }

  notifySeatBlocked(payload: SeatBlockedPayload): void {
    this.server.to(flightRoom(payload.flightId)).emit(SEAT_EVENTS.BLOCKED, payload);
  }

  notifySeatReleased(payload: SeatReleasedPayload): void {
    this.server.to(flightRoom(payload.flightId)).emit(SEAT_EVENTS.RELEASED, payload);
  }

  @SubscribeMessage(SEAT_EVENTS.JOIN_FLIGHT)
  handleJoinFlight(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinFlightPayload) {
    client.join(flightRoom(payload.flightId));
  }

  @SubscribeMessage(SEAT_EVENTS.LEAVE_FLIGHT)
  handleLeaveFlight(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinFlightPayload) {
    client.leave(flightRoom(payload.flightId));
  }

  @SubscribeMessage(SEAT_EVENTS.BLOCK)
  async handleSeatBlock(@ConnectedSocket() client: Socket, @MessageBody() payload: SeatBlockRequest) {
    try {
      const result = await this.blockSeatUseCase.execute(payload.flightId, payload.seatId, client.id);
      this.trackLock(client.id, payload.flightId, payload.seatId);
      return { ok: true as const, ...result };
    } catch (error) {
      return {
        ok: false as const,
        seatId: payload.seatId,
        message: error instanceof Error ? error.message : 'No se pudo bloquear el asiento',
      };
    }
  }

  @SubscribeMessage(SEAT_EVENTS.RELEASE)
  async handleSeatRelease(@ConnectedSocket() client: Socket, @MessageBody() payload: SeatReleaseRequest) {
    const released = await this.releaseSeatUseCase.execute(payload.flightId, payload.seatId, client.id);
    if (released) this.untrackLock(client.id, payload.seatId);
    return { ok: released };
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const locks = this.locksByClient.get(client.id);
    if (!locks || locks.size === 0) return;

    this.locksByClient.delete(client.id);
    await Promise.all(
      Array.from(locks.values()).map((lock) =>
        this.releaseSeatUseCase.execute(lock.flightId, lock.seatId, client.id),
      ),
    );
  }

  private trackLock(clientId: string, flightId: string, seatId: string): void {
    const locks = this.locksByClient.get(clientId) ?? new Map<string, LockedSeat>();
    locks.set(seatId, { flightId, seatId });
    this.locksByClient.set(clientId, locks);
  }

  private untrackLock(clientId: string, seatId: string): void {
    this.locksByClient.get(clientId)?.delete(seatId);
  }
}
